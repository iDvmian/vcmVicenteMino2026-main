import { Module } from '@nestjs/common';
import { PlanteamientosController } from './planteamientos.controller';
import { PlanteamientosService } from './planteamientos.service';

@Module({
  controllers: [PlanteamientosController],
  providers: [PlanteamientosService],
  exports: [PlanteamientosService],
})
export class PlanteamientosModule {}
