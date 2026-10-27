import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoSolicitud } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

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

  @ApiPropertyOptional({ example: 'Talca', description: 'Filtrar por ciudad (comuna)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filtrar por ID de facultad' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  facultadId?: number;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Desde (AAAA-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaDesde debe tener formato AAAA-MM-DD' })
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Hasta (AAAA-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaHasta debe tener formato AAAA-MM-DD' })
  fechaHasta?: string;

  @ApiPropertyOptional({ example: true, description: 'Solo solicitudes que aún no tienen planteamiento' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  sinPlanteamiento?: boolean;

  @ApiPropertyOptional({ example: 'Rosa', description: 'Nombre, apellido o correo del solicitante' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  solicitante?: string;

  @ApiPropertyOptional({ enum: ['recientes', 'antiguas'], default: 'recientes' })
  @IsOptional()
  @IsIn(['recientes', 'antiguas'])
  orden?: 'recientes' | 'antiguas';

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
