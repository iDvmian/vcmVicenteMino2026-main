import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsOptional, ArrayUnique } from 'class-validator';

export class UpdateProyectoDto {
  @ApiPropertyOptional({ example: [1, 2, 3], description: 'Reemplaza la lista completa de alumnos asignados' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ArrayUnique()
  @Type(() => Number)
  alumnoIds?: number[];

  @ApiPropertyOptional({ example: '2026-07-15' })
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiPropertyOptional({ example: '2026-12-15' })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;
}
