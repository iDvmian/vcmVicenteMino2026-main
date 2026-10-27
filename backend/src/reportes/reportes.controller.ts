import { Controller, Get, Query, Request, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';
import { QueryReporteDto } from './dto/query-reporte.dto';
import { ReporteGeneralService } from './reporte-general.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { QueryReporteProyectosDto } from './dto/query-reporte-proyectos.dto';
import { ReportesService } from './reportes.service';

@ApiTags('reportes')
@ApiBearerAuth()
@Controller('reportes')
export class ReportesController {
  constructor(
    private readonly reportesService: ReportesService,
    private readonly dashboardService: DashboardService,
    private readonly reporteGeneral: ReporteGeneralService,
  ) {}

  @Get('catalogo')
  @Roles(Role.ADMIN, Role.GESTOR_VCM, Role.ENCARGADO_CARRERA, Role.DECANO)
  @ApiOperation({ summary: 'Columnas y estados disponibles para cada tipo de reporte' })
  catalogo() {
    return this.reporteGeneral.catalogo();
  }

  @Get('datos')
  @Roles(Role.ADMIN, Role.GESTOR_VCM, Role.ENCARGADO_CARRERA, Role.DECANO)
  @ApiOperation({ summary: 'Vista previa de un reporte de solicitudes, planteamientos o proyectos' })
  datos(@Query() query: QueryReporteDto, @Request() req: { user: CurrentUser }) {
    return this.reporteGeneral.datos(query, req.user);
  }

  @Get('pdf')
  @Roles(Role.ADMIN, Role.GESTOR_VCM, Role.ENCARGADO_CARRERA, Role.DECANO)
  @ApiOperation({ summary: 'Descargar en PDF un reporte de solicitudes, planteamientos o proyectos' })
  @ApiProduces('application/pdf')
  async pdf(
    @Query() query: QueryReporteDto,
    @Request() req: { user: CurrentUser },
    @Res() res: Response,
  ) {
    const buffer = await this.reporteGeneral.pdf(query, req.user);
    const nombre = `reporte-${query.tipo.toLowerCase()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(buffer);
  }

  @Get('dashboard')
  @Roles(Role.DECANO, Role.ADMIN)
  @ApiOperation({
    summary: 'Indicadores y estadísticas del panel del Decano (filtrable por fechas, carrera y tipo de intervención)',
  })
  @ApiResponse({ status: 200, description: 'Indicadores calculados' })
  getDashboard(@Query() query: QueryDashboardDto) {
    return this.dashboardService.getDashboard(query);
  }

  @Get('proyectos')
  @Roles(
    Role.ADMIN,
    Role.GESTOR_VCM,
    Role.ENCARGADO_CARRERA,
    Role.DECANO,
  )
  @ApiOperation({
    summary: 'Generar reporte PDF de proyectos, filtrable por estado y carrera (RF-40)',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'Archivo PDF generado' })
  async generarReporteProyectos(
    @Query() query: QueryReporteProyectosDto,
    @Request() req: { user: CurrentUser },
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.generarReporteProyectos(query, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-proyectos.pdf"');
    res.send(buffer);
  }
}
