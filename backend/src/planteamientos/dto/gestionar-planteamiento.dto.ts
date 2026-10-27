import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoPlanteamiento } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';

export class GestionarPlanteamientoDto {
  @ApiProperty({
    enum: [EstadoPlanteamiento.APROBADO, EstadoPlanteamiento.RECHAZADO],
    example: EstadoPlanteamiento.APROBADO,
    description: 'Solo APROBADO o RECHAZADO — no se puede volver a PENDIENTE',
  })
  @IsEnum(EstadoPlanteamiento)
  estado: EstadoPlanteamiento;

  @ApiPropertyOptional({ example: 'Falta detallar las horas por actividad.', description: 'Obligatorio cuando el estado es RECHAZADO' })
  @ValidateIf((o) => o.estado === EstadoPlanteamiento.RECHAZADO)
  @IsString()
  @IsNotEmpty({ message: 'Debes indicar el motivo del rechazo' })
  @MaxLength(500)
  motivoRechazo?: string;
}
