import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsOptional, ArrayUnique, Min, Max } from 'class-validator';

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

  @ApiPropertyOptional({ example: 3, description: 'Docentes alcanzados por la intervención' })
  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero' })
  @Min(0)
  @Max(100000)
  @Type(() => Number)
  participantesDocentes?: number;

  @ApiPropertyOptional({ example: 40, description: 'Estudiantes alcanzados por la intervención' })
  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero' })
  @Min(0)
  @Max(100000)
  @Type(() => Number)
  participantesEstudiantes?: number;

  @ApiPropertyOptional({ example: 25, description: 'Personas externas a la universidad alcanzadas' })
  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero' })
  @Min(0)
  @Max(100000)
  @Type(() => Number)
  participantesExternos?: number;
}
