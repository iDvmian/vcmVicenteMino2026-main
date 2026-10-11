import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoSolicitud } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';

export class GestionarSolicitudDto {
  @ApiProperty({ enum: EstadoSolicitud, example: EstadoSolicitud.APROBADA })
  @IsEnum(EstadoSolicitud)
  estado: EstadoSolicitud;

  @ApiPropertyOptional({ example: 1, description: 'Carrera a la que se vincula la solicitud (opcional; p. ej. al aprobar)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  carreraId?: number;
}
