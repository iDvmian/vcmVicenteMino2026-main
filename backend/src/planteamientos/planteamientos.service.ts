import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoPlanteamiento, EstadoSolicitud, Role } from '@prisma/client';
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

@Injectable()
export class PlanteamientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly mailService: MailService,
  ) {}

  async findAll(query: QueryPlanteamientosDto, currentUser: CurrentUser) {
    const { estado, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (currentUser.rol === Role.ENCARGADO_CARRERA) {
      const user = await this.prisma.user.findUnique({ where: { id: currentUser.id } });
      if (user?.carreraId) {
        where.solicitud = { carreraId: user.carreraId };
      }
    } else {
      if (query.solicitudId !== undefined) where.solicitudId = query.solicitudId;
    }

    if (estado !== undefined) where.estado = estado;

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

  async findMisPlanteamientos(docenteId: number, query: QueryPlanteamientosDto) {
    const { estado, solicitudId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { docenteId };
    if (estado !== undefined) where.estado = estado;
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
        tiempoEstimado: dto.tiempoEstimado,
        solicitudId: dto.solicitudId,
        docenteId,
      },
      include: PLANTEAMIENTO_INCLUDE,
    });

    return { data: planteamiento, message: 'Planteamiento creado', statusCode: 201 };
  }

  async update(id: number, dto: UpdatePlanteamientoDto, currentUser: CurrentUser) {
    const planteamiento = await this.prisma.planteamiento.findUnique({ where: { id } });
    if (!planteamiento) throw new NotFoundException(`Planteamiento con id ${id} no encontrado`);

    if (currentUser.rol === Role.DOCENTE) {
      if (planteamiento.docenteId !== currentUser.id) {
        throw new ForbiddenException('No tienes permiso para editar este planteamiento');
      }
      if (planteamiento.estado !== EstadoPlanteamiento.PENDIENTE) {
        throw new BadRequestException('Solo se pueden editar planteamientos en estado PENDIENTE');
      }
    }

    const updated = await this.prisma.planteamiento.update({
      where: { id },
      data: {
        descripcion: dto.descripcion,
        tiempoEstimado: dto.tiempoEstimado,
      },
      include: PLANTEAMIENTO_INCLUDE,
    });

    return { data: updated, message: 'Planteamiento actualizado', statusCode: 200 };
  }

  async gestionar(id: number, dto: GestionarPlanteamientoDto) {
    const planteamiento = await this.prisma.planteamiento.findUnique({ where: { id } });
    if (!planteamiento) throw new NotFoundException(`Planteamiento con id ${id} no encontrado`);

    if (dto.estado === EstadoPlanteamiento.PENDIENTE) {
      throw new BadRequestException('Al gestionar, el estado debe ser APROBADO o RECHAZADO');
    }

    const updated = await this.prisma.planteamiento.update({
      where: { id },
      data: { estado: dto.estado },
      include: PLANTEAMIENTO_INCLUDE,
    });

    if (dto.estado === EstadoPlanteamiento.APROBADO || dto.estado === EstadoPlanteamiento.RECHAZADO) {
      this.mailService
        .sendPlanteamientoGestionado({
          to: updated.docente.email,
          nombreDocente: `${updated.docente.nombres} ${updated.docente.apellidos}`,
          tituloSolicitud: updated.solicitud.titulo,
          estado: dto.estado as 'APROBADO' | 'RECHAZADO',
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
