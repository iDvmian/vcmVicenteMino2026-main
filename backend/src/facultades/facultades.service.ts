import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFacultadDto } from './dto/create-facultad.dto';
import { QueryFacultadesDto } from './dto/query-facultades.dto';
import { UpdateFacultadDto } from './dto/update-facultad.dto';

@Injectable()
export class FacultadesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryFacultadesDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.facultad.findMany({
        include: { carreras: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.facultad.count(),
    ]);

    return {
      data: { items, total, page, limit },
      message: 'Facultades obtenidas exitosamente',
      statusCode: 200,
    };
  }

  async findOne(id: number) {
    const facultad = await this.prisma.facultad.findUnique({
      where: { id },
      include: { carreras: true },
    });

    if (!facultad) throw new NotFoundException(`Facultad con id ${id} no encontrada`);

    return { data: facultad, message: 'Facultad obtenida exitosamente', statusCode: 200 };
  }

  async create(dto: CreateFacultadDto) {
    const existing = await this.prisma.facultad.findUnique({
      where: { etiqueta: dto.etiqueta },
    });
    if (existing) throw new ConflictException('La etiqueta ya está en uso');

    const facultad = await this.prisma.facultad.create({
      data: dto,
      include: { carreras: true },
    });

    return { data: facultad, message: 'Facultad creada exitosamente', statusCode: 201 };
  }

  async update(id: number, dto: UpdateFacultadDto) {
    const existing = await this.prisma.facultad.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Facultad con id ${id} no encontrada`);

    if (dto.etiqueta && dto.etiqueta !== existing.etiqueta) {
      const etiquetaTaken = await this.prisma.facultad.findFirst({
        where: { etiqueta: dto.etiqueta, NOT: { id } },
      });
      if (etiquetaTaken) throw new ConflictException('La etiqueta ya está en uso');
    }

    const facultad = await this.prisma.facultad.update({
      where: { id },
      data: dto,
      include: { carreras: true },
    });

    return { data: facultad, message: 'Facultad actualizada exitosamente', statusCode: 200 };
  }

  async remove(id: number) {
    const carrerasCount = await this.prisma.carrera.count({ where: { facultadId: id } });
    if (carrerasCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar: la facultad tiene carreras asociadas',
      );
    }

    const existing = await this.prisma.facultad.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Facultad con id ${id} no encontrada`);

    await this.prisma.facultad.delete({ where: { id } });

    return { data: null, message: 'Facultad eliminada exitosamente', statusCode: 200 };
  }
}
