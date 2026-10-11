import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsOptional, ArrayUnique } from 'class-validator';

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
}
