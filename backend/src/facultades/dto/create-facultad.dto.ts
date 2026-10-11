import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFacultadDto {
  @ApiProperty({ example: 'Facultad de Ciencias de la Ingeniería' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'FIC' })
  @IsString()
  @IsNotEmpty()
  etiqueta: string;
}
