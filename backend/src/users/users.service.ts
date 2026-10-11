import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    const { rol, estado, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(rol !== undefined && { rol }),
      ...(estado !== undefined && { estado }),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        omit: { password: true },
        include: { carrera: { include: { facultad: true } } },
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

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { password: true },
      include: { carrera: { include: { facultad: true } } },
    });

    if (!user) throw new NotFoundException(`Usuario con id ${id} no encontrado`);

    return { data: user, message: 'Usuario obtenido exitosamente', statusCode: 200 };
  }

  async create(dto: CreateUserDto) {
    const [existingEmail, existingRut] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.prisma.user.findUnique({ where: { rut: dto.rut } }),
    ]);

    if (existingEmail) throw new ConflictException('El email ya está registrado');
    if (existingRut) throw new ConflictException('El RUT ya está registrado');

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
      },
      omit: { password: true },
      include: { carrera: { include: { facultad: true } } },
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

    const { password: plainPassword, carreraId, ...rest } = dto;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { ...rest };

    if (plainPassword) {
      data.password = await bcrypt.hash(plainPassword, 12);
    }

    if (carreraId !== undefined) {
      data.carreraId = carreraId;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      omit: { password: true },
      include: { carrera: { include: { facultad: true } } },
    });

    return { data: user, message: 'Usuario actualizado exitosamente', statusCode: 200 };
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
