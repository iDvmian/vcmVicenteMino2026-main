import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsOptional, ArrayUnique, Min, Max } from 'class-validator';

export class CreateProyectoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  planteamientoId: number;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({ example: '2026-12-01' })
  @IsDateString()
  fechaFin: string;

  @ApiPropertyOptional({ example: [1, 2, 3], description: 'IDs de alumnos voluntarios a asignar' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ArrayUnique()
  @Type(() => Number)
  alumnoIds?: number[];

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

  @ApiPropertyOptional({ example: 25, description: 'Docentes externos a la universidad alcanzados' })
  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero' })
  @Min(0)
  @Max(100000)
  @Type(() => Number)
  participantesDocentesExternos?: number;

  @ApiPropertyOptional({ example: 25, description: 'Alumnos externos a la universidad alcanzados' })
  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero' })
  @Min(0)
  @Max(100000)
  @Type(() => Number)
  participantesAlumnosExternos?: number;

  @ApiPropertyOptional({ example: 25, description: 'Otras personas externas (comunidad, vecinos, etc.) alcanzadas' })
  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero' })
  @Min(0)
  @Max(100000)
  @Type(() => Number)
  participantesOtrosExternos?: number;
}
