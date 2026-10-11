import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

export class CreateAlumnoVoluntarioDto {
  @ApiProperty({ example: '12345678-9' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{1,8}-[\dkK]$/, { message: 'RUT inválido (ej: 12345678-9)' })
  rut: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  nombres: string;

  @ApiProperty({ example: 'Pérez González' })
  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @ApiProperty({ example: 'juan.perez@alumnos.ucm.cl' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+56912345678' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  carreraId: number;
}
