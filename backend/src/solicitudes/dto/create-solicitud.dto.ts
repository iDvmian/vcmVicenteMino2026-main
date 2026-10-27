import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCliente } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches, Max, MaxLength, ValidateIf } from 'class-validator';
import { COMUNAS_MAULE } from '../../common/constants/comunas-maule';

export class CreateSolicitudDto {
  @ApiProperty({ example: 'Capacitación en Excel para adultos mayores' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  titulo: string;

  @ApiProperty({ example: 'Necesitamos capacitar a 30 adultos mayores en uso básico de Excel.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(560)
  descripcion: string;

   @ApiProperty({ example: 'Talca', enum: COMUNAS_MAULE })
  @IsString()
  @IsNotEmpty()
  @IsIn(COMUNAS_MAULE, { message: 'La ciudad debe ser una comuna de la región del Maule' })
  ciudad: string;

  @ApiProperty({ example: 'Calle 1 Norte' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  direccion: string;

  @ApiPropertyOptional({ example: '1234' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  numeroDireccion?: string;

  @ApiProperty({ example: '+56 9 1234 5678', description: 'Teléfono de contacto para esta solicitud' })
  @IsString()
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  @Matches(/^\+?[\d\s]{8,20}$/, { message: 'Teléfono inválido (ej: +56 9 1234 5678)' })
  telefono: string;

  @ApiProperty({ enum: TipoCliente, example: TipoCliente.JUNTA_VECINOS, description: 'Tipo de organización o persona que solicita' })
  @IsEnum(TipoCliente, { message: 'Tipo de cliente inválido' })
  tipoCliente: TipoCliente;

  @ApiPropertyOptional({ example: 'Cooperativa agrícola', description: 'Obligatorio cuando tipoCliente es OTRO' })
  @ValidateIf((o) => o.tipoCliente === TipoCliente.OTRO)
  @IsString()
  @IsNotEmpty({ message: 'Indica qué tipo de cliente eres' })
  @MaxLength(100)
  tipoClienteOtro?: string;

  @ApiPropertyOptional({ example: 'Junta de vecinos Villa Los Aromos', description: 'Organización con la que se trabajará (iniciativa de docente)' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombreOrganizacion?: string;

  @ApiPropertyOptional({ example: 30, description: 'Cantidad aproximada de personas que participarían (iniciativa de docente)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(100000)
  personasPrevistas?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  carreraId?: number;
}
