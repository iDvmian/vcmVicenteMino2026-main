import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarreraDto } from './dto/create-carrera.dto';
import { QueryCarrerasDto } from './dto/query-carreras.dto';
import { UpdateCarreraDto } from './dto/update-carrera.dto';

@Injectable()
export class CarrerasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryCarrerasDto) {
    const { facultadId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(facultadId !== undefined && { facultadId }),
    };

    const [items, total] = await Promise.all([
      this.prisma.carrera.findMany({
        where,
        include: { facultad: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.carrera.count({ where }),
    ]);

    return {
      data: { items, total, page, limit },
      message: 'Carreras obtenidas exitosamente',
      statusCode: 200,
    };
  }

  async findOne(id: number) {
    const carrera = await this.prisma.carrera.findUnique({
      where: { id },
      include: { facultad: true },
    });

    if (!carrera) throw new NotFoundException(`Carrera con id ${id} no encontrada`);

    return { data: carrera, message: 'Carrera obtenida exitosamente', statusCode: 200 };
  }

  async create(dto: CreateCarreraDto) {
    const existing = await this.prisma.carrera.findUnique({
      where: { etiqueta: dto.etiqueta },
    });
    if (existing) throw new ConflictException('La etiqueta ya está en uso');

    const facultad = await this.prisma.facultad.findUnique({
      where: { id: dto.facultadId },
    });
    if (!facultad) throw new NotFoundException('Facultad no encontrada');

    const carrera = await this.prisma.carrera.create({
      data: dto,
      include: { facultad: true },
    });

    return { data: carrera, message: 'Carrera creada exitosamente', statusCode: 201 };
  }

  async update(id: number, dto: UpdateCarreraDto) {
    const existing = await this.prisma.carrera.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Carrera con id ${id} no encontrada`);

    if (dto.etiqueta && dto.etiqueta !== existing.etiqueta) {
      const etiquetaTaken = await this.prisma.carrera.findFirst({
        where: { etiqueta: dto.etiqueta, NOT: { id } },
      });
      if (etiquetaTaken) throw new ConflictException('La etiqueta ya está en uso');
    }

    if (dto.facultadId && dto.facultadId !== existing.facultadId) {
      const facultad = await this.prisma.facultad.findUnique({
        where: { id: dto.facultadId },
      });
      if (!facultad) throw new NotFoundException('Facultad no encontrada');
    }

    const carrera = await this.prisma.carrera.update({
      where: { id },
      data: dto,
      include: { facultad: true },
    });

    return { data: carrera, message: 'Carrera actualizada exitosamente', statusCode: 200 };
  }

  async remove(id: number) {
    const [userCount, alumnoCount] = await Promise.all([
      this.prisma.user.count({ where: { carreraId: id } }),
      this.prisma.alumnoVoluntario.count({ where: { carreraId: id } }),
    ]);

    if (userCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar: la carrera tiene usuarios asociados',
      );
    }
    if (alumnoCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar: la carrera tiene alumnos voluntarios asociados',
      );
    }

    const existing = await this.prisma.carrera.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Carrera con id ${id} no encontrada`);

    await this.prisma.carrera.delete({ where: { id } });

    return { data: null, message: 'Carrera eliminada exitosamente', statusCode: 200 };
  }
}
