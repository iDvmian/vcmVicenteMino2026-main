import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreatePlanteamientoDto {
  @ApiProperty({ example: 'Se propone desarrollar un taller de 8 sesiones de 2 horas cada una.' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: '2 meses' })
  @IsString()
  @IsNotEmpty()
  tiempoEstimado: string;

  @ApiProperty({ example: 1, description: 'ID de la solicitud APROBADA a la que responde este planteamiento' })
  @IsInt()
  @IsPositive()
  solicitudId: number;
}
