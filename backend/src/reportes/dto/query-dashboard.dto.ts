import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoIntervencion } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches } from 'class-validator';

export class QueryDashboardDto {
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Solicitudes recibidas desde (AAAA-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaDesde debe tener formato AAAA-MM-DD' })
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Solicitudes recibidas hasta (AAAA-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaHasta debe tener formato AAAA-MM-DD' })
  fechaHasta?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filtrar por ID de carrera' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  carreraId?: number;

  @ApiPropertyOptional({ enum: TipoIntervencion })
  @IsOptional()
  @IsEnum(TipoIntervencion)
  tipoIntervencion?: TipoIntervencion;
}
