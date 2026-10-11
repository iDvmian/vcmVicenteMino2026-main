import { ApiProperty } from '@nestjs/swagger';
import { EstadoProyecto } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateEstadoProyectoDto {
  @ApiProperty({ enum: EstadoProyecto, example: EstadoProyecto.PAUSADO })
  @IsEnum(EstadoProyecto)
  estado: EstadoProyecto;
}
