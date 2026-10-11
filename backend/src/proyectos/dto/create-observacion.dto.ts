import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateObservacionDto {
  @ApiProperty({ example: 'El proyecto avanza según lo planificado.' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;
}
