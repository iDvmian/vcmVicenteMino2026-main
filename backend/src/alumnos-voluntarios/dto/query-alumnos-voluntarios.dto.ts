import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryAlumnosVoluntariosDto {
  @ApiPropertyOptional({ example: 1, description: 'Filtrar por ID de carrera' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  carreraId?: number;

  @ApiPropertyOptional({ example: 'true', description: 'Filtrar por estado activo/inactivo' })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Número de página' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Resultados por página (máx 100)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}
