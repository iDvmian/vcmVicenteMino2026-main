import { ApiProperty } from '@nestjs/swagger';
import { TipoIntervencion, UnidadDuracion } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreatePlanteamientoDto {
  @ApiProperty({ example: 'Se propone desarrollar un taller de 8 sesiones de 2 horas cada una.' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ required: false, example: '2 meses', description: 'Se calcula solo a partir de duracionCantidad y duracionUnidad' })
  @IsOptional()
  @IsString()
  tiempoEstimado?: string;

  @ApiProperty({ example: 2, description: 'Duración de la ejecución del proyecto' })
  @IsInt({ message: 'La duración debe ser un número entero' })
  @Min(1, { message: 'La duración debe ser al menos 1' })
  @Max(999)
  duracionCantidad: number;

  @ApiProperty({ enum: UnidadDuracion, example: UnidadDuracion.MESES })
  @IsEnum(UnidadDuracion, { message: 'La unidad de duración no es válida' })
  duracionUnidad: UnidadDuracion;

  @ApiProperty({ example: 120, description: 'Horas hombre totales destinadas al proyecto' })
  @IsInt({ message: 'Las horas hombre deben ser un número entero' })
  @Min(1, { message: 'Las horas hombre deben ser al menos 1' })
  @Max(100000)
  horasHombre: number;

  @ApiProperty({ enum: TipoIntervencion, example: TipoIntervencion.CHARLA })
  @IsEnum(TipoIntervencion, { message: 'El tipo de intervención no es válido' })
  tipoIntervencion: TipoIntervencion;

  @ApiProperty({ required: false, example: 'Feria de emprendimiento', description: 'Obligatorio si el tipo es OTRO' })
  @ValidateIf((o) => o.tipoIntervencion === TipoIntervencion.OTRO)
  @IsString()
  @IsNotEmpty({ message: 'Debes describir el tipo de intervención' })
  @MaxLength(100)
  tipoIntervencionOtro?: string;

  @ApiProperty({ example: 1, description: 'ID de la solicitud APROBADA a la que responde este planteamiento' })
  @IsInt()
  @IsPositive()
  solicitudId: number;
}
