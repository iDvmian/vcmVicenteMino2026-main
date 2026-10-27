import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EstadoProyecto, EstadoSolicitud, EtapaSeguimiento, Role } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const DIA_MS = 24 * 60 * 60 * 1000;

/** Iniciativa ya cerrada (rechazada, finalizada o cancelada) con la fecha en que se cerró. */
interface Cerrada {
  id: number;
  titulo: string;
  estadoFinal: string;
  fechaCierre: Date;
  avisoRetencionEn: Date | null;
}

/**
 * Retención de datos: las iniciativas se conservan 5 años desde su cierre (el ciclo de acreditación)
 * y luego se eliminan solas, con toda su cadena (planteamiento, proyecto, observaciones y archivos).
 *
 *  - Cierre = rechazo de la solicitud, o término (finalizado/cancelado) del proyecto.
 *    Las iniciativas pendientes o en curso nunca se borran.
 *  - Antes de borrar se avisa por correo a los administradores; se elimina recién pasados
 *    AVISO_DIAS desde ese aviso, y nunca antes de cumplirse el plazo.
 *  - Cada eliminación deja una fila en RegistroDepuracion.
 *
 * Variables de entorno opcionales: RETENCION_ACTIVA (false para apagarla), RETENCION_ANIOS (5)
 * y RETENCION_AVISO_DIAS (30).
 */
@Injectable()
export class RetencionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetencionService.name);
  private timers: NodeJS.Timeout[] = [];
  private ejecutando = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private get anios(): number {
    const n = Number(this.config.get('RETENCION_ANIOS'));
    return Number.isFinite(n) && n >= 1 ? n : 5;
  }

  private get avisoDias(): number {
    const n = Number(this.config.get('RETENCION_AVISO_DIAS'));
    return Number.isFinite(n) && n >= 1 ? n : 30;
  }

  onModuleInit(): void {
    if (String(this.config.get('RETENCION_ACTIVA') ?? 'true').toLowerCase() === 'false') {
      this.logger.warn('Depuración por antigüedad desactivada (RETENCION_ACTIVA=false)');
      return;
    }
    // Primera revisión poco después de arrancar y luego una vez al día
    const primera = setTimeout(() => void this.ejecutar(), 2 * 60 * 1000);
    const diaria = setInterval(() => void this.ejecutar(), DIA_MS);
    primera.unref();
    diaria.unref();
    this.timers = [primera, diaria];
  }

  onModuleDestroy(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
  }

  /** Una pasada completa: avisa lo que corresponda y elimina lo que ya cumplió plazo y aviso. */
  async ejecutar(ahora = new Date()): Promise<{ avisadas: number; eliminadas: number }> {
    if (this.ejecutando) return { avisadas: 0, eliminadas: 0 };
    this.ejecutando = true;
    try {
      const limiteBorrado = new Date(ahora);
      limiteBorrado.setFullYear(limiteBorrado.getFullYear() - this.anios);
      const limiteAviso = new Date(limiteBorrado.getTime() + this.avisoDias * DIA_MS);

      const cerradas = await this.cerradasHasta(limiteAviso);

      // 1) Avisar las que entran en el periodo de aviso y aún no fueron avisadas
      const porAvisar = cerradas.filter((c) => c.avisoRetencionEn === null);
      const avisadas = await this.avisar(porAvisar, ahora);

      // 2) Eliminar las que ya cumplieron el plazo Y ya pasaron AVISO_DIAS desde el aviso
      const aviso = new Date(ahora.getTime() - this.avisoDias * DIA_MS);
      const porEliminar = cerradas.filter(
        (c) => c.fechaCierre <= limiteBorrado && c.avisoRetencionEn !== null && c.avisoRetencionEn <= aviso,
      );
      let eliminadas = 0;
      for (const c of porEliminar) {
        try {
          await this.eliminar(c);
          eliminadas++;
        } catch (err) {
          this.logger.error(`No se pudo depurar la solicitud ${c.id}: ${(err as Error).message}`);
        }
      }

      if (avisadas || eliminadas) {
        this.logger.log(`Depuración: ${avisadas} avisadas, ${eliminadas} eliminadas`);
      }
      return { avisadas, eliminadas };
    } catch (err) {
      this.logger.error(`Falló la depuración por antigüedad: ${(err as Error).message}`);
      return { avisadas: 0, eliminadas: 0 };
    } finally {
      this.ejecutando = false;
    }
  }

  /** Iniciativas cerradas cuya fecha de cierre es anterior o igual a `limite`. */
  private async cerradasHasta(limite: Date): Promise<Cerrada[]> {
    // El cierre ocurre después de crearse: si se creó después del límite, no puede calificar
    const candidatas = await this.prisma.solicitud.findMany({
      where: {
        createdAt: { lte: limite },
        OR: [
          { estado: EstadoSolicitud.RECHAZADA },
          { planteamiento: { is: { proyecto: { is: { estado: { in: [EstadoProyecto.FINALIZADO, EstadoProyecto.CANCELADO] } } } } } },
        ],
      },
      select: {
        id: true,
        titulo: true,
        estado: true,
        updatedAt: true,
        avisoRetencionEn: true,
        planteamiento: { select: { proyecto: { select: { estado: true, updatedAt: true } } } },
        historial: {
          where: {
            etapa: {
              in: [
                EtapaSeguimiento.SOLICITUD_RECHAZADA,
                EtapaSeguimiento.PROYECTO_FINALIZADO,
                EtapaSeguimiento.PROYECTO_CANCELADO,
              ],
            },
          },
          select: { etapa: true, fecha: true },
          orderBy: { fecha: 'desc' },
        },
      },
    });

    const resultado: Cerrada[] = [];
    for (const s of candidatas) {
      const proyecto = s.planteamiento?.proyecto;

      let estadoFinal: string;
      let fechaCierre: Date;
      if (proyecto && (proyecto.estado === EstadoProyecto.FINALIZADO || proyecto.estado === EstadoProyecto.CANCELADO)) {
        estadoFinal = `PROYECTO_${proyecto.estado}`;
        const etapa = proyecto.estado === EstadoProyecto.FINALIZADO
          ? EtapaSeguimiento.PROYECTO_FINALIZADO
          : EtapaSeguimiento.PROYECTO_CANCELADO;
        fechaCierre = s.historial.find((h) => h.etapa === etapa)?.fecha ?? proyecto.updatedAt;
      } else if (s.estado === EstadoSolicitud.RECHAZADA) {
        estadoFinal = 'SOLICITUD_RECHAZADA';
        fechaCierre = s.historial.find((h) => h.etapa === EtapaSeguimiento.SOLICITUD_RECHAZADA)?.fecha ?? s.updatedAt;
      } else {
        continue;
      }

      if (fechaCierre <= limite) {
        resultado.push({ id: s.id, titulo: s.titulo, estadoFinal, fechaCierre, avisoRetencionEn: s.avisoRetencionEn });
      }
    }
    return resultado;
  }

  /** Avisa a los administradores y marca las iniciativas como avisadas solo si el correo salió. */
  private async avisar(items: Cerrada[], ahora: Date): Promise<number> {
    if (items.length === 0) return 0;

    const admins = await this.prisma.user.findMany({
      where: { rol: Role.ADMIN, estado: true },
      select: { email: true },
    });
    const formato = (d: Date) => d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const eliminarDesde = new Date(ahora.getTime() + this.avisoDias * DIA_MS);

    const enviado = await this.mail.sendAvisoDepuracion({
      to: admins.map((a) => a.email),
      anios: this.anios,
      eliminarDesde: formato(eliminarDesde),
      items: items.map((i) => ({ titulo: i.titulo, fechaCierre: formato(i.fechaCierre) })),
    });
    if (!enviado) {
      this.logger.warn('No se pudo enviar el aviso de depuración; no se eliminará nada hasta que se envíe');
      return 0;
    }

    await this.prisma.solicitud.updateMany({
      where: { id: { in: items.map((i) => i.id) } },
      data: { avisoRetencionEn: ahora },
    });
    return items.length;
  }

  /** Elimina la solicitud con toda su cadena y deja constancia en RegistroDepuracion. */
  private async eliminar(c: Cerrada): Promise<void> {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id: c.id },
      select: {
        archivos: { select: { publicId: true } },
        planteamiento: {
          select: {
            id: true,
            archivos: { select: { publicId: true } },
            proyecto: { select: { id: true, archivos: { select: { publicId: true } } } },
          },
        },
      },
    });
    if (!solicitud) return;

    const planteamiento = solicitud.planteamiento;
    const proyecto = planteamiento?.proyecto ?? null;
    const publicIds = [
      ...solicitud.archivos,
      ...(planteamiento?.archivos ?? []),
      ...(proyecto?.archivos ?? []),
    ].map((a) => a.publicId);

    // Primero los archivos externos: si falla uno se registra y se sigue (no deben bloquear la depuración)
    let archivosBorrados = 0;
    for (const publicId of publicIds) {
      try {
        await this.storage.deleteFile(publicId);
        archivosBorrados++;
      } catch (err) {
        this.logger.warn(`No se pudo borrar el archivo ${publicId}: ${(err as Error).message}`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (proyecto) {
        await tx.observacion.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.archivoProyecto.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.proyectoAlumno.deleteMany({ where: { proyectoId: proyecto.id } });
        await tx.proyecto.delete({ where: { id: proyecto.id } });
      }
      if (planteamiento) {
        await tx.archivoPlanteamiento.deleteMany({ where: { planteamientoId: planteamiento.id } });
        await tx.planteamiento.delete({ where: { id: planteamiento.id } });
      }
      await tx.archivoSolicitud.deleteMany({ where: { solicitudId: c.id } });
      await tx.solicitud.delete({ where: { id: c.id } }); // el historial de etapas se elimina en cascada
      await tx.registroDepuracion.create({
        data: {
          solicitudId: c.id,
          titulo: c.titulo,
          estadoFinal: c.estadoFinal,
          fechaCierre: c.fechaCierre,
          archivosBorrados,
        },
      });
    });
  }
}
