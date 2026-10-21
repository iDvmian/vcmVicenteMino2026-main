import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { DashboardService } from './dashboard.service';
import { ReportesService } from './reportes.service';

@Module({
  controllers: [ReportesController],
  providers: [ReportesService, DashboardService],
})
export class ReportesModule {}
