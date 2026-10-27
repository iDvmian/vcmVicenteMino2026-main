import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { facultadDelDecano } from '../common/alcance';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto, actor?: { id: number; rol: string }) {
    const { rol, estado, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // El Decano solo ve a los usuarios de las carreras de su facultad
    const facultadDecano = actor ? await facultadDelDecano(this.prisma, actor) : null;

    const where = {
      ...(rol !== undefined && { rol }),
      ...(estado !== undefined && { estado }),
      ...(facultadDecano !== null && { carrera: { is: { facultadId: facultadDecano } } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        omit: { password: true },
        include: { carrera: { include: { facultad: true } }, facultad: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: { items, total, page, limit },
      message: 'Usuarios obtenidos exitosamente',
      statusCode: 200,
    };
  }

  async findOne(id: number, actor?: { id: number; rol: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { password: true },
      include: { carrera: { include: { facultad: true } }, facultad: true },
    });

    if (!user) throw new NotFoundException(`Usuario con id ${id} no encontrado`);

    const facultadDecano = actor ? await facultadDelDecano(this.prisma, actor) : null;
    if (facultadDecano !== null && user.id !== actor!.id && user.carrera?.facultadId !== facultadDecano) {
      throw new ForbiddenException('Este usuario no pertenece a tu facultad');
    }

    return { data: user, message: 'Usuario obtenido exitosamente', statusCode: 200 };
  }

  async create(dto: CreateUserDto) {
    const [existingEmail, existingRut] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.prisma.user.findUnique({ where: { rut: dto.rut } }),
    ]);

    if (existingEmail) throw new ConflictException('El email ya está registrado');
    if (existingRut) throw new ConflictException('El RUT ya está registrado');

    const facultadId = await this.validarFacultad(dto.rol, dto.facultadId);

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        rut: dto.rut,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        email: dto.email,
        telefono: dto.telefono,
        password: hashedPassword,
        rol: dto.rol,
        carreraId: dto.carreraId,
        facultadId,
      },
      omit: { password: true },
      include: { carrera: { include: { facultad: true } }, facultad: true },
    });

    return { data: user, message: 'Usuario creado exitosamente', statusCode: 201 };
  }

  async update(id: number, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Usuario con id ${id} no encontrado`);

    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (emailTaken) throw new ConflictException('El email ya está registrado');
    }

    if (dto.rut && dto.rut !== existing.rut) {
      const rutTaken = await this.prisma.user.findFirst({
        where: { rut: dto.rut, NOT: { id } },
      });
      if (rutTaken) throw new ConflictException('El RUT ya está registrado');
    }

    const { password: plainPassword, carreraId, facultadId: _facultadId, ...rest } = dto;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { ...rest };

    if (plainPassword) {
      data.password = await bcrypt.hash(plainPassword, 12);
    }

    if (carreraId !== undefined) {
      data.carreraId = carreraId;
    }

    // La facultad solo aplica al Decano: es obligatoria para ese rol y se limpia para los demás
    if (dto.rol !== undefined || dto.facultadId !== undefined) {
      const rolFinal = dto.rol ?? existing.rol;
      data.facultadId = await this.validarFacultad(rolFinal, dto.facultadId ?? existing.facultadId ?? undefined);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      omit: { password: true },
      include: { carrera: { include: { facultad: true } }, facultad: true },
    });

    return { data: user, message: 'Usuario actualizado exitosamente', statusCode: 200 };
  }

  /** Un Decano debe tener facultad; el resto de los roles no la usa (queda en null). */
  private async validarFacultad(rol: Role, facultadId?: number): Promise<number | null> {
    if (rol !== Role.DECANO) return null;
    if (facultadId === undefined) {
      throw new BadRequestException('El Decano debe tener una facultad asignada');
    }
    const facultad = await this.prisma.facultad.findUnique({ where: { id: facultadId } });
    if (!facultad) throw new NotFoundException('Facultad no encontrada');
    return facultadId;
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (emailTaken) throw new ConflictException('El email ya está registrado');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        nombres: dto.nombres?.trim(),
        apellidos: dto.apellidos?.trim(),
        email: dto.email,
        // vacío => se borra el teléfono (null); undefined => no se toca
        telefono: dto.telefono === undefined ? undefined : dto.telefono?.trim() || null,
      },
      omit: { password: true },
      include: { carrera: { include: { facultad: true } }, facultad: true },
    });

    return { data: user, message: 'Perfil actualizado exitosamente', statusCode: 200 };
  }

  async remove(id: number, currentUserId: number) {
    if (id === currentUserId) {
      throw new BadRequestException('No puedes eliminarte a ti mismo');
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Usuario con id ${id} no encontrado`);

    await this.prisma.user.delete({ where: { id } });

    return { data: null, message: 'Usuario eliminado exitosamente', statusCode: 200 };
  }
}
