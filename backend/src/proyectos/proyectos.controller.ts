import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateObservacionDto } from './dto/create-observacion.dto';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { QueryProyectosDto } from './dto/query-proyectos.dto';
import { UpdateEstadoProyectoDto } from './dto/update-estado-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { ProyectosService } from './proyectos.service';

@ApiTags('proyectos')
@ApiBearerAuth()
@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly proyectosService: ProyectosService) {}

  // IMPORTANTE: /mis-proyectos antes de /:id para evitar colisión de rutas
  @Get('mis-proyectos')
  @Roles(
    Role.ADMIN,
    Role.GESTOR_VCM,
    Role.ENCARGADO_CARRERA,
    Role.DOCENTE,
    Role.DECANO,
  )
  @ApiOperation({ summary: 'Obtener mis proyectos (como docente)' })
  @ApiOkResponse({ description: 'Lista de proyectos propios obtenida exitosamente' })
  findMisProyectos(
    @Query() query: QueryProyectosDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.proyectosService.findMisProyectos(req.user, query);
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.GESTOR_VCM,
    Role.ENCARGADO_CARRERA,
    Role.DOCENTE,
    Role.DECANO,
  )
  @ApiOperation({ summary: 'Listar proyectos (filtrado automático por rol)' })
  @ApiOkResponse({ description: 'Lista de proyectos obtenida exitosamente' })
  findAll(
    @Query() query: QueryProyectosDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.proyectosService.findAll(query, req.user);
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.GESTOR_VCM,
    Role.ENCARGADO_CARRERA,
    Role.DOCENTE,
    Role.DECANO,
  )
  @ApiOperation({ summary: 'Obtener un proyecto por ID' })
  @ApiOkResponse({ description: 'Proyecto encontrado' })
  @ApiNotFoundResponse({ description: 'Proyecto no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin permiso para ver este proyecto' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: CurrentUser },
  ) {
    return this.proyectosService.findOne(id, req.user);
  }

  @Post()
  @Roles(Role.DOCENTE, Role.ADMIN)
  @ApiOperation({ summary: 'Crear proyecto a partir de un planteamiento APROBADO' })
  @ApiCreatedResponse({ description: 'Proyecto creado' })
  @ApiNotFoundResponse({ description: 'Planteamiento no encontrado' })
  @ApiBadRequestResponse({ description: 'Planteamiento no APROBADO, ya tiene proyecto, o alumnos inválidos' })
  create(
    @Body() dto: CreateProyectoDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.proyectosService.create(dto, req.user);
  }

  @Patch(':id')
  @Roles(Role.DOCENTE, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar fechas y/o alumnos del proyecto' })
  @ApiOkResponse({ description: 'Proyecto actualizado' })
  @ApiNotFoundResponse({ description: 'Proyecto no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin permiso para editar este proyecto' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProyectoDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.proyectosService.update(id, dto, req.user);
  }

  @Patch(':id/estado')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.GESTOR_VCM)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar estado del proyecto' })
  @ApiOkResponse({ description: 'Estado actualizado' })
  @ApiNotFoundResponse({ description: 'Proyecto no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin permiso para cambiar el estado' })
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoProyectoDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.proyectosService.updateEstado(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(Role.DOCENTE, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar proyecto (solo EN_PROCESO sin observaciones para DOCENTE)' })
  @ApiOkResponse({ description: 'Proyecto eliminado' })
  @ApiNotFoundResponse({ description: 'Proyecto no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin permiso para eliminar este proyecto' })
  @ApiBadRequestResponse({ description: 'No se puede eliminar: tiene observaciones o no está en EN_PROCESO' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: CurrentUser },
  ) {
    return this.proyectosService.remove(id, req.user);
  }

  @Post(':proyectoId/observaciones')
  @Roles(
    Role.DOCENTE,
    Role.ADMIN,
    Role.GESTOR_VCM,
    Role.ENCARGADO_CARRERA,
    Role.DECANO,
  )
  @ApiOperation({ summary: 'Agregar observación al proyecto' })
  @ApiCreatedResponse({ description: 'Observación registrada' })
  @ApiNotFoundResponse({ description: 'Proyecto no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin permiso para agregar observaciones' })
  addObservacion(
    @Param('proyectoId', ParseIntPipe) proyectoId: number,
    @Body() dto: CreateObservacionDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.proyectosService.addObservacion(proyectoId, dto, req.user);
  }

  @Get(':proyectoId/observaciones')
  @Roles(
    Role.ADMIN,
    Role.GESTOR_VCM,
    Role.ENCARGADO_CARRERA,
    Role.DOCENTE,
    Role.DECANO,
  )
  @ApiOperation({ summary: 'Listar observaciones del proyecto' })
  @ApiOkResponse({ description: 'Observaciones obtenidas exitosamente' })
  @ApiNotFoundResponse({ description: 'Proyecto no encontrado' })
  getObservaciones(
    @Param('proyectoId', ParseIntPipe) proyectoId: number,
    @Request() req: { user: CurrentUser },
  ) {
    return this.proyectosService.getObservaciones(proyectoId, req.user);
  }

  @Delete(':proyectoId/observaciones/:obsId')
  @Roles(Role.DOCENTE, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar observación del proyecto' })
  @ApiOkResponse({ description: 'Observación eliminada' })
  @ApiNotFoundResponse({ description: 'Proyecto u observación no encontrada' })
  @ApiForbiddenResponse({ description: 'Solo puedes eliminar tus propias observaciones (DOCENTE)' })
  removeObservacion(
    @Param('proyectoId', ParseIntPipe) proyectoId: number,
    @Param('obsId', ParseIntPipe) obsId: number,
    @Request() req: { user: CurrentUser },
  ) {
    return this.proyectosService.removeObservacion(proyectoId, obsId, req.user);
  }
}
