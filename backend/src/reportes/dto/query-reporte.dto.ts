import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoIntervencion } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const TIPOS_REPORTE = ['SOLICITUDES', 'PLANTEAMIENTOS', 'PROYECTOS'] as const;
export type TipoReporte = (typeof TIPOS_REPORTE)[number];

export class QueryReporteDto {
  @ApiProperty({ enum: TIPOS_REPORTE })
  @IsIn(TIPOS_REPORTE, { message: 'tipo debe ser SOLICITUDES, PLANTEAMIENTOS o PROYECTOS' })
  tipo: TipoReporte;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Desde (AAAA-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaDesde debe tener formato AAAA-MM-DD' })
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Hasta (AAAA-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaHasta debe tener formato AAAA-MM-DD' })
  fechaHasta?: string;

  @ApiPropertyOptional({ description: 'Estado (depende del tipo de reporte)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  estado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  carreraId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  facultadId?: number;

  @ApiPropertyOptional({ enum: TipoIntervencion })
  @IsOptional()
  @IsEnum(TipoIntervencion)
  tipoIntervencion?: TipoIntervencion;

  @ApiPropertyOptional({ example: 'Talca', description: 'Comuna de la solicitud' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string;

  @ApiPropertyOptional({ example: 'Pérez', description: 'Nombre o apellido del docente' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  docente?: string;

  @ApiPropertyOptional({ enum: ['recientes', 'antiguas'], default: 'recientes' })
  @IsOptional()
  @IsIn(['recientes', 'antiguas'])
  orden?: 'recientes' | 'antiguas';

  @ApiPropertyOptional({ example: 'id,titulo,estado', description: 'Columnas separadas por coma' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  columnas?: string;

  @ApiPropertyOptional({ example: 15, description: 'Cantidad de filas a devolver en la vista previa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  @Type(() => Number)
  limite?: number;
}
