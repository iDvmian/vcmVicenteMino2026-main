import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoSolicitud } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, ValidateIf } from 'class-validator';

export class GestionarSolicitudDto {
  @ApiProperty({ enum: EstadoSolicitud, example: EstadoSolicitud.APROBADA })
  @IsEnum(EstadoSolicitud)
  estado: EstadoSolicitud;

  @ApiPropertyOptional({ example: 1, description: 'Carrera a la que se vincula la solicitud (opcional; p. ej. al aprobar)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  carreraId?: number;

  @ApiPropertyOptional({ example: 'La solicitud no corresponde al ámbito de la facultad', description: 'Obligatorio cuando el estado es RECHAZADA' })
  @ValidateIf((o: GestionarSolicitudDto) => o.estado === EstadoSolicitud.RECHAZADA)
  @IsString()
  @IsNotEmpty({ message: 'Debes indicar el motivo del rechazo' })
  @MaxLength(500, { message: 'El motivo no puede superar los 500 caracteres' })
  motivoRechazo?: string;
}
