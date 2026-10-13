import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoProyecto, Role } from '@prisma/client';
import { CurrentUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateObservacionDto } from './dto/create-observacion.dto';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { QueryProyectosDto } from './dto/query-proyectos.dto';
import { UpdateEstadoProyectoDto } from './dto/update-estado-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';

const PROYECTO_INCLUDE = {
  planteamiento: {
    include: {
      solicitud: {
        include: {
          cliente: { select: { id: true, nombres: true, apellidos: true, email: true } },
          carrera: { include: { facultad: true } },
        },
      },
      docente: { select: { id: true, nombres: true, apellidos: true, email: true } },
    },
  },
  alumnos: {
    include: {
      alumno: { include: { carrera: { include: { facultad: true } } } },
    },
  },
  archivos: { orderBy: { createdAt: 'asc' as const } },
  observaciones: {
    include: { autor: { select: { id: true, nombres: true, apellidos: true, email: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

@Injectable()
export class ProyectosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(query: QueryProyectosDto, currentUser: CurrentUser) {
    const { estado, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (
      currentUser.rol !== Role.ADMIN &&
      currentUser.rol !== Role.GESTOR_VCM &&
      currentUser.rol !== Role.DECANO
    ) {
      if (currentUser.rol === Role.ENCARGADO_CARRERA) {
        const user = await this.prisma.user.findUnique({ where: { id: currentUser.id } });
        if (user?.carreraId) {
          where.planteamiento = { solicitud: { carreraId: user.carreraId } };
        }
      } else if (currentUser.rol === Role.DOCENTE) {
        where.planteamiento = { docenteId: currentUser.id };
      }
    }

    if (estado !== undefined) where.estado = estado;

    const [items, total] = await Promise.all([
      this.prisma.proyecto.findMany({
        where,
        include: PROYECTO_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.proyecto.count({ where }),
    ]);

    return { data: { items, total, page, limit }, message: 'Proyectos obtenidos exitosamente', statusCode: 200 };
  }

  async findMisProyectos(currentUser: CurrentUser, query: QueryProyectosDto) {
    const { estado, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { planteamiento: { docenteId: currentUser.id } };
    if (estado !== undefined) where.estado = estado;

    const [items, total] = await Promise.all([
      this.prisma.proyecto.findMany({
        where,
        include: PROYECTO_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.proyecto.count({ where }),
    ]);

    return { data: { items, total, page, limit }, message: 'Mis proyectos obtenidos exitosamente', statusCode: 200 };
  }

  async findOne(id: number, currentUser: CurrentUser) {
    const proyecto = await this.prisma.proyecto.findUnique({ where: { id }, include: PROYECTO_INCLUDE });
    if (!proyecto) throw new NotFoundException(`Proyecto con id ${id} no encontrado`);

    if (currentUser.rol === Role.DOCENTE && proyecto.planteamiento.docenteId !== currentUser.id) {
      throw new ForbiddenException('No tienes permiso para ver este proyecto');
    }

    return { data: proyecto, message: 'Proyecto obtenido exitosamente', statusCode: 200 };
  }

  async create(dto: CreateProyectoDto, currentUser: CurrentUser) {
    const planteamiento = await this.prisma.planteamiento.findUnique({
      where: { id: dto.planteamientoId },
      include: { proyecto: { select: { id: true } } },
    });

    if (!planteamiento) throw new NotFoundException('Planteamiento no encontrado');

    if (planteamiento.estado !== 'APROBADO') {
      throw new BadRequestException('Solo se pueden crear proyectos a partir de planteamientos en estado APROBADO');
    }

    if (planteamiento.proyecto) {
      throw new BadRequestException('Este planteamiento ya tiene un proyecto asociado');
    }

    if (dto.alumnoIds && dto.alumnoIds.length > 0) {
      const alumnos = await this.prisma.alumnoVoluntario.findMany({
        where: { id: { in: dto.alumnoIds } },
        select: { id: true },
      });
      if (alumnos.length !== dto.alumnoIds.length) {
        throw new BadRequestException('Uno o más alumnos voluntarios no existen');
      }
    }

    const proyecto = await this.prisma.$transaction(async (tx) => {
      const created = await tx.proyecto.create({
        data: {
          planteamientoId: dto.planteamientoId,
          fechaInicio: new Date(dto.fechaInicio),
          fechaFin: new Date(dto.fechaFin),
          participantesDocentes: dto.participantesDocentes,
          participantesEstudiantes: dto.participantesEstudiantes,
          participantesExternos: dto.participantesExternos,
          estado: EstadoProyecto.EN_PROCESO,
        },
      });

      if (dto.alumnoIds && dto.alumnoIds.length > 0) {
        await tx.proyectoAlumno.createMany({
          data: dto.alumnoIds.map((alumnoId) => ({ proyectoId: created.id, alumnoId })),
        });
      }

      return created;
    });

    return this.findOne(proyecto.id, currentUser);
  }

  async update(id: number, dto: UpdateProyectoDto, currentUser: CurrentUser) {
    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id },
      include: { planteamiento: { select: { docenteId: true } } },
    });
    if (!proyecto) throw new NotFoundException(`Proyecto con id ${id} no encontrado`);

    if (currentUser.rol === Role.DOCENTE && proyecto.planteamiento.docenteId !== currentUser.id) {
      throw new ForbiddenException('No tienes permiso para editar este proyecto');
    }

    if (dto.alumnoIds !== undefined) {
      if (dto.alumnoIds.length > 0) {
        const alumnos = await this.prisma.alumnoVoluntario.findMany({
          where: { id: { in: dto.alumnoIds } },
          select: { id: true },
        });
        if (alumnos.length !== dto.alumnoIds.length) {
          throw new BadRequestException('Uno o más alumnos voluntarios no existen');
        }
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.proyectoAlumno.deleteMany({ where: { proyectoId: id } });
        if (dto.alumnoIds!.length > 0) {
          await tx.proyectoAlumno.createMany({
            data: dto.alumnoIds!.map((alumnoId) => ({ proyectoId: id, alumnoId })),
          });
        }
      });
    }

    const dataToUpdate: Record<string, unknown> = {};
    if (dto.fechaInicio !== undefined) dataToUpdate.fechaInicio = new Date(dto.fechaInicio);
    if (dto.fechaFin !== undefined) dataToUpdate.fechaFin = new Date(dto.fechaFin);
    // undefined = no tocar; null = vaciar el dato
    if (dto.participantesDocentes !== undefined) dataToUpdate.participantesDocentes = dto.participantesDocentes;
    if (dto.participantesEstudiantes !== undefined) dataToUpdate.participantesEstudiantes = dto.participantesEstudiantes;
    if (dto.participantesExternos !== undefined) dataToUpdate.participantesExternos = dto.participantesExternos;

    if (Object.keys(dataToUpdate).length > 0) {
      await this.prisma.proyecto.update({ where: { id }, data: dataToUpdate });
    }

    const updated = await this.prisma.proyecto.findUnique({ where: { id }, include: PROYECTO_INCLUDE });
    return { data: updated, message: 'Proyecto actualizado', statusCode: 200 };
  }

  async updateEstado(id: number, dto: UpdateEstadoProyectoDto, currentUser: CurrentUser) {
    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id },
      include: { planteamiento: { select: { docenteId: true } } },
    });
    if (!proyecto) throw new NotFoundException(`Proyecto con id ${id} no encontrado`);

    if (currentUser.rol === Role.DOCENTE && proyecto.planteamiento.docenteId !== currentUser.id) {
      throw new ForbiddenException('No tienes permiso para cambiar el estado de este proyecto');
    }

    const updated = await this.prisma.proyecto.update({
      where: { id },
      data: { estado: dto.estado },
      include: PROYECTO_INCLUDE,
    });

    return { data: updated, message: 'Estado actualizado', statusCode: 200 };
  }

  async remove(id: number, currentUser: CurrentUser) {
    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id },
      include: {
        planteamiento: { select: { docenteId: true } },
        observaciones: { select: { id: true } },
        archivos: { select: { id: true, publicId: true } },
      },
    });
    if (!proyecto) throw new NotFoundException(`Proyecto con id ${id} no encontrado`);

    if (currentUser.rol === Role.DOCENTE) {
      if (proyecto.planteamiento.docenteId !== currentUser.id) {
        throw new ForbiddenException('No tienes permiso para eliminar este proyecto');
      }
      if (proyecto.estado !== EstadoProyecto.EN_PROCESO) {
        throw new BadRequestException('Solo se pueden eliminar proyectos en estado EN_PROCESO');
      }
    }

    if (proyecto.observaciones.length > 0) {
      throw new BadRequestException('No se puede eliminar: el proyecto tiene observaciones registradas');
    }

    // Borrar la evidencia en Cloudinary antes de eliminar los registros (evita archivos huérfanos)
    for (const archivo of proyecto.archivos) {
      await this.storageService.deleteFile(archivo.publicId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.archivoProyecto.deleteMany({ where: { proyectoId: id } });
      await tx.proyectoAlumno.deleteMany({ where: { proyectoId: id } });
      await tx.proyecto.delete({ where: { id } });
    });

    return { data: null, message: 'Proyecto eliminado', statusCode: 200 };
  }

  // ── Evidencia (archivos del proyecto) ──────────────────────
  async addArchivo(proyectoId: number, file: Express.Multer.File, currentUser: CurrentUser) {
    if (!file) throw new BadRequestException('Debes adjuntar un archivo');

    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { planteamiento: { select: { docenteId: true } } },
    });
    if (!proyecto) throw new NotFoundException(`Proyecto con id ${proyectoId} no encontrado`);

    if (currentUser.rol === Role.DOCENTE && proyecto.planteamiento.docenteId !== currentUser.id) {
      throw new ForbiddenException('No tienes permiso para agregar archivos a este proyecto');
    }
    if (proyecto.estado === EstadoProyecto.CANCELADO) {
      throw new BadRequestException('No se pueden agregar archivos a un proyecto cancelado');
    }

    const { url, publicId } = await this.storageService.uploadFile(file, 'proyectos');

    const archivo = await this.prisma.archivoProyecto.create({
      data: { url, publicId, nombre: file.originalname, proyectoId },
    });

    return { data: archivo, message: 'Archivo subido', statusCode: 201 };
  }

  async removeArchivo(proyectoId: number, archivoId: number, currentUser: CurrentUser) {
    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { planteamiento: { select: { docenteId: true } } },
    });
    if (!proyecto) throw new NotFoundException(`Proyecto con id ${proyectoId} no encontrado`);

    const archivo = await this.prisma.archivoProyecto.findFirst({
      where: { id: archivoId, proyectoId },
    });
    if (!archivo) throw new NotFoundException(`Archivo con id ${archivoId} no encontrado`);

    if (currentUser.rol === Role.DOCENTE && proyecto.planteamiento.docenteId !== currentUser.id) {
      throw new ForbiddenException('No tienes permiso para eliminar archivos de este proyecto');
    }

    await this.storageService.deleteFile(archivo.publicId);
    await this.prisma.archivoProyecto.delete({ where: { id: archivoId } });

    return { data: null, message: 'Archivo eliminado', statusCode: 200 };
  }

  async addObservacion(proyectoId: number, dto: CreateObservacionDto, currentUser: CurrentUser) {
    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { planteamiento: { select: { docenteId: true } } },
    });
    if (!proyecto) throw new NotFoundException(`Proyecto con id ${proyectoId} no encontrado`);

    if (currentUser.rol === Role.DOCENTE && proyecto.planteamiento.docenteId !== currentUser.id) {
      throw new ForbiddenException('No tienes permiso para agregar observaciones a este proyecto');
    }

    const observacion = await this.prisma.observacion.create({
      data: { descripcion: dto.descripcion, proyectoId, autorId: currentUser.id },
      include: { autor: { select: { id: true, nombres: true, apellidos: true, email: true } } },
    });

    return { data: observacion, message: 'Observación registrada', statusCode: 201 };
  }

  async getObservaciones(proyectoId: number, currentUser: CurrentUser) {
    const proyecto = await this.prisma.proyecto.findUnique({ where: { id: proyectoId } });
    if (!proyecto) throw new NotFoundException(`Proyecto con id ${proyectoId} no encontrado`);

    const observaciones = await this.prisma.observacion.findMany({
      where: { proyectoId },
      include: { autor: { select: { id: true, nombres: true, apellidos: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return { data: observaciones, message: 'Observaciones obtenidas exitosamente', statusCode: 200 };
  }

  async removeObservacion(proyectoId: number, obsId: number, currentUser: CurrentUser) {
    const proyecto = await this.prisma.proyecto.findUnique({ where: { id: proyectoId } });
    if (!proyecto) throw new NotFoundException(`Proyecto con id ${proyectoId} no encontrado`);

    const observacion = await this.prisma.observacion.findFirst({
      where: { id: obsId, proyectoId },
    });
    if (!observacion) throw new NotFoundException(`Observación con id ${obsId} no encontrada en este proyecto`);

    if (currentUser.rol === Role.DOCENTE && observacion.autorId !== currentUser.id) {
      throw new ForbiddenException('Solo puedes eliminar tus propias observaciones');
    }

    await this.prisma.observacion.delete({ where: { id: obsId } });

    return { data: null, message: 'Observación eliminada', statusCode: 200 };
  }
}
