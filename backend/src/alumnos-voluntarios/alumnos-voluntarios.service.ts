import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlumnoVoluntarioDto } from './dto/create-alumno-voluntario.dto';
import { QueryAlumnosVoluntariosDto } from './dto/query-alumnos-voluntarios.dto';
import { UpdateAlumnoVoluntarioDto } from './dto/update-alumno-voluntario.dto';

@Injectable()
export class AlumnosVoluntariosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * El encargado de carrera solo opera sobre los alumnos de su propia carrera.
   * Devuelve el id de esa carrera (o -1 si no tiene ninguna, para que no vea ni toque nada);
   * para el resto de los roles devuelve null (sin restricción).
   */
  private async carreraRestringida(user: CurrentUser): Promise<number | null> {
    // El encargado y el docente solo ven alumnos de su propia carrera
    if (user.rol !== Role.ENCARGADO_CARRERA && user.rol !== Role.DOCENTE) return null;
    const u = await this.prisma.user.findUnique({ where: { id: user.id }, select: { carreraId: true } });
    return u?.carreraId ?? -1;
  }

  private verificarCarrera(restringida: number | null, carreraId: number): void {
    if (restringida !== null && restringida !== carreraId) {
      throw new ForbiddenException('Solo puedes acceder a alumnos voluntarios de tu carrera');
    }
  }

  async findAll(query: QueryAlumnosVoluntariosDto, user: CurrentUser) {
    const { carreraId, estado, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    const restringida = await this.carreraRestringida(user);
    if (restringida !== null) where.carreraId = restringida;
    else if (carreraId !== undefined) where.carreraId = carreraId;
    if (estado !== undefined) where.estado = estado === 'true';

    const [items, total] = await Promise.all([
      this.prisma.alumnoVoluntario.findMany({
        where,
        include: { carrera: { include: { facultad: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.alumnoVoluntario.count({ where }),
    ]);

    return {
      data: { items, total, page, limit },
      message: 'Alumnos voluntarios obtenidos exitosamente',
      statusCode: 200,
    };
  }

  async findOne(id: number, user: CurrentUser) {
    const alumno = await this.prisma.alumnoVoluntario.findUnique({
      where: { id },
      include: { carrera: { include: { facultad: true } } },
    });

    if (!alumno) throw new NotFoundException(`Alumno voluntario con id ${id} no encontrado`);
    this.verificarCarrera(await this.carreraRestringida(user), alumno.carreraId);

    return { data: alumno, message: 'Alumno voluntario obtenido exitosamente', statusCode: 200 };
  }

  async create(dto: CreateAlumnoVoluntarioDto, user: CurrentUser) {
    this.verificarCarrera(await this.carreraRestringida(user), dto.carreraId);

    const rutTaken = await this.prisma.alumnoVoluntario.findUnique({
      where: { rut: dto.rut },
    });
    if (rutTaken) throw new ConflictException('El RUT ya está registrado');

    const emailTaken = await this.prisma.alumnoVoluntario.findUnique({
      where: { email: dto.email },
    });
    if (emailTaken) throw new ConflictException('El email ya está en uso');

    const carrera = await this.prisma.carrera.findUnique({ where: { id: dto.carreraId } });
    if (!carrera) throw new NotFoundException('Carrera no encontrada');

    const alumno = await this.prisma.alumnoVoluntario.create({
      data: dto,
      include: { carrera: { include: { facultad: true } } },
    });

    return { data: alumno, message: 'Alumno voluntario creado', statusCode: 201 };
  }

  async update(id: number, dto: UpdateAlumnoVoluntarioDto, user: CurrentUser) {
    const existing = await this.prisma.alumnoVoluntario.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Alumno voluntario con id ${id} no encontrado`);

    const restringida = await this.carreraRestringida(user);
    this.verificarCarrera(restringida, existing.carreraId);
    if (dto.carreraId !== undefined) this.verificarCarrera(restringida, dto.carreraId);

    delete (dto as Partial<UpdateAlumnoVoluntarioDto>).rut;

    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.prisma.alumnoVoluntario.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (emailTaken) throw new ConflictException('El email ya está en uso');
    }

    if (dto.carreraId && dto.carreraId !== existing.carreraId) {
      const carrera = await this.prisma.carrera.findUnique({ where: { id: dto.carreraId } });
      if (!carrera) throw new NotFoundException('Carrera no encontrada');
    }

    const alumno = await this.prisma.alumnoVoluntario.update({
      where: { id },
      data: dto,
      include: { carrera: { include: { facultad: true } } },
    });

    return { data: alumno, message: 'Alumno voluntario actualizado', statusCode: 200 };
  }

  async remove(id: number, user: CurrentUser) {
    const existing = await this.prisma.alumnoVoluntario.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Alumno voluntario con id ${id} no encontrado`);
    this.verificarCarrera(await this.carreraRestringida(user), existing.carreraId);

    const proyectosCount = await this.prisma.proyectoAlumno.count({ where: { alumnoId: id } });
    if (proyectosCount > 0) {
      throw new BadRequestException('No se puede eliminar: el alumno tiene proyectos asignados');
    }

    await this.prisma.alumnoVoluntario.delete({ where: { id } });

    return { data: null, message: 'Alumno voluntario eliminado', statusCode: 200 };
  }
}
