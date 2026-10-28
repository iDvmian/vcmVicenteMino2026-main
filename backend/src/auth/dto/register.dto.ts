import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import { IsRut } from '../../common/validators/is-rut.validator';

export class RegisterDto {
  @ApiProperty({ example: '12345678-9' })
  @IsString()
  @IsNotEmpty()
  @IsRut({ message: 'RUT inválido (ej: 12345678-9)' })
  rut: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  nombres: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @ApiProperty({ example: 'juan.perez@ucm.cl' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+56912345678' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.CLIENTE })
  @IsEnum(Role)
  @IsOptional()
  rol?: Role;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  carreraId?: number;
}
