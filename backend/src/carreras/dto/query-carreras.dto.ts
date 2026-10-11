import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class QueryCarrerasDto {
  @ApiPropertyOptional({ example: 1, description: 'Filtrar por ID de facultad' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  facultadId?: number;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Número de página' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Resultados por página (máx 100)' })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
