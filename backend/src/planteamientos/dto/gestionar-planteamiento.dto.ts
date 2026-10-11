import { ApiProperty } from '@nestjs/swagger';
import { EstadoPlanteamiento } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class GestionarPlanteamientoDto {
  @ApiProperty({
    enum: [EstadoPlanteamiento.APROBADO, EstadoPlanteamiento.RECHAZADO],
    example: EstadoPlanteamiento.APROBADO,
    description: 'Solo APROBADO o RECHAZADO — no se puede volver a PENDIENTE',
  })
  @IsEnum(EstadoPlanteamiento)
  estado: EstadoPlanteamiento;
}
