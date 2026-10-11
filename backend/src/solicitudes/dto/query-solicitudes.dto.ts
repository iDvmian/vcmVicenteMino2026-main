import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoSolicitud } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class QuerySolicitudesDto {
  @ApiPropertyOptional({ enum: EstadoSolicitud, example: EstadoSolicitud.PENDIENTE })
  @IsOptional()
  @IsEnum(EstadoSolicitud)
  estado?: EstadoSolicitud;

  @ApiPropertyOptional({ example: 1, description: 'Filtrar por ID de carrera' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  carreraId?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}
