import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSolicitud, Role } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { GestionarSolicitudDto } from './dto/gestionar-solicitud.dto';
import { QuerySolicitudesDto } from './dto/query-solicitudes.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud.dto';
import { CurrentUser } from '../auth/strategies/jwt.strategy';

const SOLICITUD_INCLUDE = {
  cliente: { select: { id: true, nombres: true, apellidos: true, email: true, rut: true } },
  carrera: { include: { facultad: true } },
  archivos: true,
  planteamiento: { select: { id: true, estado: true, createdAt: true } },
} as const;

@Injectable()
export class SolicitudesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly mailService: MailService,
  ) {}

  async findAll(query: QuerySolicitudesDto, currentUser: CurrentUser) {
    const { estado, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (currentUser.rol === Role.ENCARGADO_CARRERA || currentUser.rol === Role.DOCENTE) {
      const user = await this.prisma.user.findUnique({ where: { id: currentUser.id } });
      if (user?.carreraId) {
        where.carreraId = user.carreraId;
      }
    } else {
      if (query.carreraId !== undefined) where.carreraId = query.carreraId;
    }

    if (estado !== undefined) where.estado = estado;

    const [items, total] = await Promise.all([
      this.prisma.solicitud.findMany({
        where,
        include: SOLICITUD_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.solicitud.count({ where }),
    ]);

    return {
      data: { items, total, page, limit },
      message: 'Solicitudes obtenidas exitosamente',
      statusCode: 200,
    };
  }

  async findMisSolicitudes(clienteId: number, query: QuerySolicitudesDto) {
    const { estado, carreraId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { clienteId };
    if (estado !== undefined) where.estado = estado;
    if (carreraId !== undefined) where.carreraId = carreraId;

    const [items, total] = await Promise.all([
      this.prisma.solicitud.findMany({
        where,
        include: SOLICITUD_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.solicitud.count({ where }),
    ]);

    return {
      data: { items, total, page, limit },
      message: 'Mis solicitudes obtenidas exitosamente',
      statusCode: 200,
    };
  }

  async findOne(id: number, currentUser: CurrentUser) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: SOLICITUD_INCLUDE,
    });

    if (!solicitud) throw new NotFoundException(`Solicitud con id ${id} no encontrada`);

    if (currentUser.rol === Role.CLIENTE && solicitud.clienteId !== currentUser.id) {
      throw new ForbiddenException('No tienes permiso para ver esta solicitud');
    }

    return { data: solicitud, message: 'Solicitud obtenida exitosamente', statusCode: 200 };
  }

  async create(dto: CreateSolicitudDto, clienteId: number) {
    if (dto.carreraId !== undefined) {
      const carrera = await this.prisma.carrera.findUnique({ where: { id: dto.carreraId } });
      if (!carrera) throw new NotFoundException('Carrera no encontrada');
    }

    const solicitud = await this.prisma.solicitud.create({
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        ciudad: dto.ciudad,        
        direccion: dto.direccion,
        numeroDireccion: dto.numeroDireccion,
        carreraId: dto.carreraId,
        clienteId,
        estado: EstadoSolicitud.PENDIENTE,
      },
      include: SOLICITUD_INCLUDE,
    });

    return { data: solicitud, message: 'Solicitud creada', statusCode: 201 };
  }

  async update(id: number, dto: UpdateSolicitudDto, currentUser: CurrentUser) {
    const solicitud = await this.prisma.solicitud.findUnique({ where: { id } });
    if (!solicitud) throw new NotFoundException(`Solicitud con id ${id} no encontrada`);

    if (currentUser.rol !== Role.ADMIN) {
      if (solicitud.clienteId !== currentUser.id) {
        throw new ForbiddenException('No tienes permiso para editar esta solicitud');
      }
      if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
        throw new BadRequestException('Solo se pueden editar solicitudes en estado PENDIENTE');
      }
    }

    if (dto.carreraId !== undefined) {
      const carrera = await this.prisma.carrera.findUnique({ where: { id: dto.carreraId } });
      if (!carrera) throw new NotFoundException('Carrera no encontrada');
    }

    const updated = await this.prisma.solicitud.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        ciudad: dto.ciudad,
        direccion: dto.direccion,
        numeroDireccion: dto.numeroDireccion,
        carreraId: dto.carreraId,
      },
      include: SOLICITUD_INCLUDE,
    });

    return { data: updated, message: 'Solicitud actualizada', statusCode: 200 };
  }

  async gestionar(id: number, dto: GestionarSolicitudDto) {
    const solicitud = await this.prisma.solicitud.findUnique({ where: { id } });
    if (!solicitud) throw new NotFoundException(`Solicitud con id ${id} no encontrada`);

    if (dto.carreraId !== undefined) {
      const carrera = await this.prisma.carrera.findUnique({ where: { id: dto.carreraId } });
      if (!carrera) throw new NotFoundException('Carrera no encontrada');
    }

    const updated = await this.prisma.solicitud.update({
      where: { id },
      data: {
        estado: dto.estado,
        ...(dto.carreraId !== undefined && { carreraId: dto.carreraId }),
      },
      include: SOLICITUD_INCLUDE,
    });

    if (dto.estado === EstadoSolicitud.APROBADA || dto.estado === EstadoSolicitud.RECHAZADA) {
      this.mailService
        .sendSolicitudGestionada({
          to: updated.cliente.email,
          nombreCliente: `${updated.cliente.nombres} ${updated.cliente.apellidos}`,
          tituloSolicitud: updated.titulo,
          estado: dto.estado as 'APROBADA' | 'RECHAZADA',
        })
        .catch((err) => console.error('[SolicitudesService] Error enviando notificación:', err));
    }

    return { data: updated, message: 'Solicitud gestionada', statusCode: 200 };
  }

  async remove(id: number, currentUser: CurrentUser) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        planteamiento: { select: { id: true } },
        archivos: { select: { id: true, publicId: true } },
      },
    });
    if (!solicitud) throw new NotFoundException(`Solicitud con id ${id} no encontrada`);

    if (currentUser.rol !== Role.ADMIN) {
      if (solicitud.clienteId !== currentUser.id) {
        throw new ForbiddenException('No tienes permiso para eliminar esta solicitud');
      }
      if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
        throw new BadRequestException('Solo se pueden eliminar solicitudes en estado PENDIENTE');
      }
    }

    if (solicitud.planteamiento) {
      throw new BadRequestException('No se puede eliminar: la solicitud tiene un planteamiento');
    }

    // Borrar archivos en Cloudinary antes de eliminar los registros (evita huérfanos)
    for (const archivo of solicitud.archivos) {
      await this.storageService.deleteFile(archivo.publicId);
    }

    await this.prisma.archivoSolicitud.deleteMany({ where: { solicitudId: id } });
    await this.prisma.solicitud.delete({ where: { id } });

    return { data: null, message: 'Solicitud eliminada', statusCode: 200 };
  }

  async addArchivo(solicitudId: number, file: Express.Multer.File, currentUser: CurrentUser) {
    const solicitud = await this.prisma.solicitud.findUnique({ where: { id: solicitudId } });
    if (!solicitud) throw new NotFoundException(`Solicitud con id ${solicitudId} no encontrada`);

    if (currentUser.rol === Role.CLIENTE && solicitud.clienteId !== currentUser.id) {
      throw new ForbiddenException('No tienes permiso para agregar archivos a esta solicitud');
    }

    const { url, publicId } = await this.storageService.uploadFile(file, 'solicitudes');

    const archivo = await this.prisma.archivoSolicitud.create({
      data: {
        url,
        publicId,
        nombre: file.originalname,
        solicitudId,
      },
    });

    return { data: archivo, message: 'Archivo subido', statusCode: 201 };
  }

  async removeArchivo(solicitudId: number, archivoId: number, currentUser: CurrentUser) {
    const solicitud = await this.prisma.solicitud.findUnique({ where: { id: solicitudId } });
    if (!solicitud) throw new NotFoundException(`Solicitud con id ${solicitudId} no encontrada`);

    const archivo = await this.prisma.archivoSolicitud.findFirst({
      where: { id: archivoId, solicitudId },
    });
    if (!archivo) throw new NotFoundException(`Archivo con id ${archivoId} no encontrado`);

    if (currentUser.rol === Role.CLIENTE && solicitud.clienteId !== currentUser.id) {
      throw new ForbiddenException('No tienes permiso para eliminar archivos de esta solicitud');
    }

    await this.storageService.deleteFile(archivo.publicId);
    await this.prisma.archivoSolicitud.delete({ where: { id: archivoId } });

    return { data: null, message: 'Archivo eliminado', statusCode: 200 };
  }
}
