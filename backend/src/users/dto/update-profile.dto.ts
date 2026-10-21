import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// Solo lo que el usuario puede cambiar de su propia cuenta.
// RUT, rol, estado y carrera NO están aquí: con la ValidationPipe en modo
// whitelist, cualquier otro campo enviado se descarta.
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Juan' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellidos?: string;

  @ApiPropertyOptional({ example: 'juan.perez@ucm.cl' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+56912345678', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string | null;
}
