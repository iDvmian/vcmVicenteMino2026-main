import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateCarreraDto {
  @ApiProperty({ example: 'Ingeniería Civil Informática' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'ICI' })
  @IsString()
  @IsNotEmpty()
  etiqueta: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  facultadId: number;
}
