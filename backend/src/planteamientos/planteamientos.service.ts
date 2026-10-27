import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { registrarEtapa } from '../common/seguimiento';
import { EstadoPlanteamiento, EstadoSolicitud, EtapaSeguimiento, Role, TipoIntervencion, UnidadDuracion } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreatePlanteamientoDto } from './dto/create-planteamiento.dto';
import { GestionarPlanteamientoDto } from './dto/gestionar-planteamiento.dto';
import { QueryPlanteamientosDto } from './dto/query-planteamientos.dto';
import { UpdatePlanteamientoDto } from './dto/update-planteamiento.dto';
import { CurrentUser } from '../auth/strategies/jwt.strategy';

const PLANTEAMIENTO_INCLUDE = {
  docente: { select: { id: true, nombres: true, apellidos: true, email: true, rut: true } },
  solicitud: {
    include: {
      cliente: { select: { id: true, nombres: true, apellidos: true, email: true } },
      carrera: { include: { facultad: true } },
    },
  },
  archivos: true,
  proyecto: { select: { id: true, estado: true, fechaInicio: true, fechaFin: true } },
} as const;

const UNIDAD_TEXTO: Record<UnidadDuracion, [string, string]> = {
  DIAS: ['día', 'días'],
  SEMANAS: ['semana', 'semanas'],
  MESES: ['mes', 'meses'],
};

/** Texto legible de la duración, ej. "2 meses" (se guarda en tiempoEstimado). */
function textoDuracion(cantidad: number, unidad: UnidadDuracion): string {
  const [singular, plural] = UNIDAD_TEXTO[unidad];
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

/** Filtros comunes: estado, tipo de intervención, fechas de creación y (opcional) búsqueda de docente. */
function buildFiltros(query: QueryPlanteamientosDto, incluirDocente: boolean): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (query.estado !== undefined) where.estado = query.estado;
  if (query.tipoIntervencion !== undefined) where.tipoIntervencion = query.tipoIntervencion;

  if (query.fechaDesde || query.fechaHasta) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (query.fechaDesde) createdAt.gte = new Date(`${query.fechaDesde}T00:00:00`);
    if (query.fechaHasta) createdAt.lte = new Date(`${query.fechaHasta}T23:59:59.999`);
    where.createdAt = createdAt;
  }

  // Cada palabra debe aparecer en nombres, apellidos o correo del docente
  if (incluirDocente && query.docente?.trim()) {
    where.AND = query.docente
      .trim()
      .split(/\s+/)
      .map((palabra) => ({
        docente: {
          OR: [
            { nombres: { contains: palabra } },
            { apellidos: { contains: palabra } },
            { email: { contains: palabra } },
          ],
        },
      }));
  }
  return where;
}

@Injectable()
export class PlanteamientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly mailService: MailService,
  ) {}

  async findAll(query: QueryPlanteamientosDto, currentUser: CurrentUser) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = buildFiltros(query, true);

    if (currentUser.rol === Role.ENCARGADO_CARRERA) {
      const user = await this.prisma.user.findUnique({ where: { id: currentUser.id } });
      if (user?.carreraId) {
        where.solicitud = { carreraId: user.carreraId };
      }
    } else {
      // El docente solo ve sus propios planteamientos
      if (currentUser.rol === Role.DOCENTE) where.docenteId = currentUser.id;
      if (query.solicitudId !== undefined) where.solicitudId = query.solicitudId;
    }

    const [items, total] = await Promise.all([
      this.prisma.planteamiento.findMany({
        where,
        include: PLANTEAMIENTO_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.planteamiento.count({ where }),
    ]);

    return {
      data: { items, total, page, limit },
      message: 'Planteamientos obtenidos exitosamente',
      statusCode: 200,
    };
  }

  /**
   * Historial de vinculaciones del docente: cada planteamiento suyo con su proyecto (si ya existe),
   * listo para mostrar totales y filtros en pantalla.
   */
  async misVinculaciones(docenteId: number) {
    const planteamientos = await this.prisma.planteamiento.findMany({
      where: { docenteId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        estado: true,
        tipoIntervencion: true,
        tipoIntervencionOtro: true,
        horasHombre: true,
        createdAt: true,
        solicitud: {
          select: {
            titulo: true,
            ciudad: true,
            carrera: { select: { etiqueta: true } },
            cliente: { select: { nombres: true, apellidos: true } },
          },
        },
        proyecto: {
          select: {
            id: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            participantesDocentes: true,
            participantesEstudiantes: true,
            participantesDocentesExternos: true,
            participantesAlumnosExternos: true,
            participantesOtrosExternos: true,
          },
        },
      },
    });

    const items = planteamientos.map((p) => {
      const pr = p.proyecto;
      let grupo: 'TRAMITE' | 'CURSO' | 'FINALIZADA' | 'CANCELADA' | 'RECHAZADA';
      let etapa: string;
      if (pr) {
        if (pr.estado === 'FINALIZADO') { grupo = 'FINALIZADA'; etapa = 'Finalizado'; }
        else if (pr.estado === 'CANCELADO') { grupo = 'CANCELADA'; etapa = 'Cancelado'; }
        else if (pr.estado === 'PAUSADO') { grupo = 'CURSO'; etapa = 'Proyecto pausado'; }
        else { grupo = 'CURSO'; etapa = 'Proyecto en proceso'; }
      } else if (p.estado === EstadoPlanteamiento.RECHAZADO) {
        grupo = 'RECHAZADA'; etapa = 'Planteamiento rechazado';
      } else if (p.estado === EstadoPlanteamiento.APROBADO) {
        grupo = 'TRAMITE'; etapa = 'Planteamiento aprobado, sin proyecto';
      } else {
        grupo = 'TRAMITE'; etapa = 'Planteamiento pendiente';
      }

      const participantes = pr
        ? (pr.participantesDocentes ?? 0) + (pr.participantesEstudiantes ?? 0) +
          (pr.participantesDocentesExternos ?? 0) + (pr.participantesAlumnosExternos ?? 0) +
          (pr.participantesOtrosExternos ?? 0)
        : 0;

      const cli = p.solicitud.cliente;
      return {
        planteamientoId: p.id,
        proyectoId: pr?.id ?? null,
        titulo: p.solicitud.titulo,
        organizacion: `${cli.nombres} ${cli.apellidos}`,
        ciudad: p.solicitud.ciudad ?? null,
        carrera: p.solicitud.carrera?.etiqueta ?? null,
        tipoIntervencion: p.tipoIntervencion,
        tipoIntervencionOtro: p.tipoIntervencionOtro,
        grupo,
        etapa,
        fechaInicio: pr?.fechaInicio ?? null,
        fechaFin: pr?.fechaFin ?? null,
        anio: (pr?.fechaInicio ?? p.createdAt).getFullYear(),
        participantes,
        horasHombre: pr ? p.horasHombre ?? 0 : 0,
      };
    });

    return { data: items, message: 'Vinculaciones obtenidas exitosamente', statusCode: 200 };
  }

  async findMisPlanteamientos(docenteId: number, query: QueryPlanteamientosDto) {
    const { solicitudId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { ...buildFiltros(query, false), docenteId };
    if (solicitudId !== undefined) where.solicitudId = solicitudId;

    const [items, total] = await Promise.all([
      this.prisma.planteamiento.findMany({
        where,
        include: PLANTEAMIENTO_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.planteamiento.count({ where }),
    ]);

    return {
      data: { items, total, page, limit },
      message: 'Mis planteamientos obtenidos exitosamente',
      statusCode: 200,
    };
  }

  async findOne(id: number, currentUser: CurrentUser) {
    const planteamiento = await this.prisma.planteamiento.findUnique({
      where: { id },
      include: PLANTEAMIENTO_INCLUDE,
    });

    if (!planteamiento) throw new NotFoundException(`Planteamiento con id ${id} no encontrado`);

    if (currentUser.rol === Role.DOCENTE && planteamiento.docenteId !== currentUser.id) {
      throw new ForbiddenException('No tienes permiso para ver este planteamiento');
    }

    return { data: planteamiento, message: 'Planteamiento obtenido exitosamente', statusCode: 200 };
  }

  async create(dto: CreatePlanteamientoDto, docenteId: number) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id: dto.solicitudId },
      include: { planteamiento: { select: { id: true } } },
    });

    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');

    if (solicitud.estado !== EstadoSolicitud.APROBADA) {
      throw new BadRequestException(
        'Solo se pueden crear planteamientos para solicitudes en estado APROBADA',
      );
    }

    if (solicitud.planteamiento) {
      throw new BadRequestException('Esta solicitud ya tiene un planteamiento asociado');
    }

    const docente = await this.prisma.user.findUnique({ where: { id: docenteId } });
    if (!docente) throw new BadRequestException('El docente no existe');

    const planteamiento = await this.prisma.planteamiento.create({
      data: {
        descripcion: dto.descripcion,
        tiempoEstimado: textoDuracion(dto.duracionCantidad, dto.duracionUnidad),
        duracionCantidad: dto.duracionCantidad,
        duracionUnidad: dto.duracionUnidad,
        horasHombre: dto.horasHombre,
        tipoIntervencion: dto.tipoIntervencion,
        tipoIntervencionOtro:
          dto.tipoIntervencion === TipoIntervencion.OTRO ? dto.tipoIntervencionOtro : null,
        solicitudId: dto.solicitudId,
        docenteId,
      },
      include: PLANTEAMIENTO_INCLUDE,
    });

    await registrarEtapa(this.prisma, dto.solicitudId, EtapaSeguimiento.PLANTEAMIENTO_CREADO, docenteId);

    return { data: planteamiento, message: 'Planteamiento creado', statusCode: 201 };
  }

  async update(id: number, dto: UpdatePlanteamientoDto, currentUser: CurrentUser) {
    const planteamiento = await this.prisma.planteamiento.findUnique({ where: { id } });
    if (!planteamiento) throw new NotFoundException(`Planteamiento con id ${id} no encontrado`);

    // Con un proyecto asociado, el planteamiento queda bloqueado
    const proyecto = await this.prisma.proyecto.findUnique({ where: { planteamientoId: id }, select: { id: true } });
    if (proyecto) {
      throw new BadRequestException('No se puede editar: el planteamiento ya tiene un proyecto asociado');
    }

    if (currentUser.rol === Role.DOCENTE) {
      if (planteamiento.docenteId !== currentUser.id) {
        throw new ForbiddenException('No tienes permiso para editar este planteamiento');
      }
      if (planteamiento.estado === EstadoPlanteamiento.APROBADO) {
        throw new BadRequestException('Solo se pueden editar planteamientos pendientes o rechazados');
      }
    }

    // Al corregir un planteamiento rechazado, vuelve a quedar pendiente para una nueva evaluación
    const vuelveAPendiente = planteamiento.estado === EstadoPlanteamiento.RECHAZADO;

    const updated = await this.prisma.planteamiento.update({
      where: { id },
      data: {
        ...(vuelveAPendiente && { estado: EstadoPlanteamiento.PENDIENTE, motivoRechazo: null }),
        descripcion: dto.descripcion,
        tiempoEstimado:
          dto.duracionCantidad !== undefined && dto.duracionUnidad !== undefined
            ? textoDuracion(dto.duracionCantidad, dto.duracionUnidad)
            : undefined,
        duracionCantidad: dto.duracionCantidad,
        duracionUnidad: dto.duracionUnidad,
        horasHombre: dto.horasHombre,
        tipoIntervencion: dto.tipoIntervencion,
        // Si el tipo deja de ser OTRO se limpia la descripción (null = vaciar en Prisma)
        tipoIntervencionOtro:
          dto.tipoIntervencion === undefined
            ? dto.tipoIntervencionOtro
            : dto.tipoIntervencion === TipoIntervencion.OTRO
              ? dto.tipoIntervencionOtro
              : null,
      },
      include: PLANTEAMIENTO_INCLUDE,
    });

    if (vuelveAPendiente) {
      await registrarEtapa(this.prisma, planteamiento.solicitudId, EtapaSeguimiento.PLANTEAMIENTO_REENVIADO, currentUser.id);
    }

    return { data: updated, message: 'Planteamiento actualizado', statusCode: 200 };
  }

  async gestionar(id: number, dto: GestionarPlanteamientoDto, usuarioId?: number) {
    const planteamiento = await this.prisma.planteamiento.findUnique({ where: { id } });
    if (!planteamiento) throw new NotFoundException(`Planteamiento con id ${id} no encontrado`);

    if (dto.estado === EstadoPlanteamiento.PENDIENTE) {
      throw new BadRequestException('Al gestionar, el estado debe ser APROBADO o RECHAZADO');
    }

    // La evaluación es única: un planteamiento ya aprobado o rechazado no se vuelve a evaluar
    // (si fue rechazado, el docente lo corrige y vuelve a quedar pendiente).
    if (planteamiento.estado !== EstadoPlanteamiento.PENDIENTE) {
      throw new BadRequestException('Este planteamiento ya fue evaluado');
    }

    const updated = await this.prisma.planteamiento.update({
      where: { id },
      data: {
        estado: dto.estado,
        // el motivo solo existe cuando está rechazado
        motivoRechazo: dto.estado === EstadoPlanteamiento.RECHAZADO ? dto.motivoRechazo?.trim() || null : null,
      },
      include: PLANTEAMIENTO_INCLUDE,
    });

    // el planteamiento estaba PENDIENTE (validado arriba), así que siempre hay cambio de estado
    if (dto.estado === EstadoPlanteamiento.APROBADO) {
      await registrarEtapa(this.prisma, planteamiento.solicitudId, EtapaSeguimiento.PLANTEAMIENTO_APROBADO, usuarioId);
    } else if (dto.estado === EstadoPlanteamiento.RECHAZADO) {
      await registrarEtapa(this.prisma, planteamiento.solicitudId, EtapaSeguimiento.PLANTEAMIENTO_RECHAZADO, usuarioId);
    }

    if (dto.estado === EstadoPlanteamiento.APROBADO || dto.estado === EstadoPlanteamiento.RECHAZADO) {
      this.mailService
        .sendPlanteamientoGestionado({
          to: updated.docente.email,
          nombreDocente: `${updated.docente.nombres} ${updated.docente.apellidos}`,
          tituloSolicitud: updated.solicitud.titulo,
          estado: dto.estado as 'APROBADO' | 'RECHAZADO',
          motivo: updated.motivoRechazo ?? undefined,
        })
        .catch((err) => console.error('[PlanteamientosService] Error enviando notificación:', err));
    }

    return { data: updated, message: 'Planteamiento gestionado', statusCode: 200 };
  }

  async remove(id: number, currentUser: CurrentUser) {
    const planteamiento = await this.prisma.planteamiento.findUnique({
      where: { id },
      include: {
        proyecto: { select: { id: true } },
        archivos: { select: { id: true, publicId: true } },
      },
    });
    if (!planteamiento) throw new NotFoundException(`Planteamiento con id ${id} no encontrado`);

    if (currentUser.rol === Role.DOCENTE) {
      if (planteamiento.docenteId !== currentUser.id) {
        throw new ForbiddenException('No tienes permiso para eliminar este planteamiento');
      }
      if (planteamiento.estado !== EstadoPlanteamiento.PENDIENTE) {
        throw new BadRequestException('Solo se pueden eliminar planteamientos en estado PENDIENTE');
      }
    }

    if (planteamiento.proyecto) {
      throw new BadRequestException('No se puede eliminar: el planteamiento tiene un proyecto asociado');
    }

    // Borrar archivos en Cloudinary antes de eliminar los registros (evita huérfanos)
    for (const archivo of planteamiento.archivos) {
      await this.storageService.deleteFile(archivo.publicId);
    }

    await this.prisma.archivoPlanteamiento.deleteMany({ where: { planteamientoId: id } });
    await this.prisma.planteamiento.delete({ where: { id } });

    return { data: null, message: 'Planteamiento eliminado', statusCode: 200 };
  }

  async addArchivo(planteamientoId: number, file: Express.Multer.File, currentUser: CurrentUser) {
    const planteamiento = await this.prisma.planteamiento.findUnique({
      where: { id: planteamientoId },
    });
    if (!planteamiento) {
      throw new NotFoundException(`Planteamiento con id ${planteamientoId} no encontrado`);
    }

    if (currentUser.rol === Role.DOCENTE && planteamiento.docenteId !== currentUser.id) {
      throw new ForbiddenException('No tienes permiso para agregar archivos a este planteamiento');
    }

    const { url, publicId } = await this.storageService.uploadFile(file, 'planteamientos');

    const archivo = await this.prisma.archivoPlanteamiento.create({
      data: {
        url,
        publicId,
        nombre: file.originalname,
        planteamientoId,
      },
    });

    return { data: archivo, message: 'Archivo subido', statusCode: 201 };
  }

  async removeArchivo(planteamientoId: number, archivoId: number, currentUser: CurrentUser) {
    const planteamiento = await this.prisma.planteamiento.findUnique({
      where: { id: planteamientoId },
    });
    if (!planteamiento) {
      throw new NotFoundException(`Planteamiento con id ${planteamientoId} no encontrado`);
    }

    const archivo = await this.prisma.archivoPlanteamiento.findFirst({
      where: { id: archivoId, planteamientoId },
    });
    if (!archivo) throw new NotFoundException(`Archivo con id ${archivoId} no encontrado`);

    if (currentUser.rol === Role.DOCENTE && planteamiento.docenteId !== currentUser.id) {
      throw new ForbiddenException('No tienes permiso para eliminar archivos de este planteamiento');
    }

    await this.storageService.deleteFile(archivo.publicId);
    await this.prisma.archivoPlanteamiento.delete({ where: { id: archivoId } });

    return { data: null, message: 'Archivo eliminado', statusCode: 200 };
  }
}
