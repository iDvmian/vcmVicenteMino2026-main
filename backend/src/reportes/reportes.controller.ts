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
import { QueryReporteProyectosDto } from './dto/query-reporte-proyectos.dto';
import { ReportesService } from './reportes.service';

@ApiTags('reportes')
@ApiBearerAuth()
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

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
