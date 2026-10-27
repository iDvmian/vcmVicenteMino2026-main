import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoPlanteamiento, TipoIntervencion } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class QueryPlanteamientosDto {
  @ApiPropertyOptional({ example: 1, description: 'Filtrar por ID de solicitud' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  solicitudId?: number;

  @ApiPropertyOptional({ enum: EstadoPlanteamiento, example: EstadoPlanteamiento.PENDIENTE })
  @IsOptional()
  @IsEnum(EstadoPlanteamiento)
  estado?: EstadoPlanteamiento;

  @ApiPropertyOptional({ enum: TipoIntervencion })
  @IsOptional()
  @IsEnum(TipoIntervencion)
  tipoIntervencion?: TipoIntervencion;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Desde (AAAA-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaDesde debe tener formato AAAA-MM-DD' })
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Hasta (AAAA-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaHasta debe tener formato AAAA-MM-DD' })
  fechaHasta?: string;

  @ApiPropertyOptional({ example: 'Rosa Mal', description: 'Buscar docente por nombre, apellido o correo' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  docente?: string;

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
