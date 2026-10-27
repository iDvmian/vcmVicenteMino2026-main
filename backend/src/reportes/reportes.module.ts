import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { DashboardService } from './dashboard.service';
import { ReporteGeneralService } from './reporte-general.service';
import { ReportesService } from './reportes.service';

@Module({
  controllers: [ReportesController],
  providers: [ReportesService, DashboardService, ReporteGeneralService],
})
export class ReportesModule {}
