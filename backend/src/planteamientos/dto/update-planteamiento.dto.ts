import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePlanteamientoDto } from './create-planteamiento.dto';

export class UpdatePlanteamientoDto extends PartialType(
  OmitType(CreatePlanteamientoDto, ['solicitudId'] as const),
) {}
