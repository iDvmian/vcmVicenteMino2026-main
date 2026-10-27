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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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
import { CreatePlanteamientoDto } from './dto/create-planteamiento.dto';
import { GestionarPlanteamientoDto } from './dto/gestionar-planteamiento.dto';
import { QueryPlanteamientosDto } from './dto/query-planteamientos.dto';
import { UpdatePlanteamientoDto } from './dto/update-planteamiento.dto';
import { PlanteamientosService } from './planteamientos.service';

@ApiTags('planteamientos')
@ApiBearerAuth()
@Controller('planteamientos')
export class PlanteamientosController {
  constructor(private readonly planteamientosService: PlanteamientosService) {}

  // IMPORTANTE: /mis-planteamientos debe ir antes de /:id para evitar colisiones de rutas
  @Get('mis-planteamientos')
  @Roles(
    Role.DOCENTE,
    Role.ADMIN,
    Role.GESTOR_VCM,
    Role.ENCARGADO_CARRERA,
    Role.DECANO,
  )
  @ApiOperation({ summary: 'Obtener mis planteamientos (como docente)' })
  @ApiOkResponse({ description: 'Lista de planteamientos propios obtenida exitosamente' })
  findMisPlanteamientos(
    @Query() query: QueryPlanteamientosDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.planteamientosService.findMisPlanteamientos(req.user.id, query);
  }

  // Debe ir antes de /:id
  @Get('mis-vinculaciones')
  @Roles(Role.DOCENTE, Role.ADMIN)
  @ApiOperation({ summary: 'Historial de vinculaciones con el medio del docente (planteamientos y sus proyectos)' })
  @ApiOkResponse({ description: 'Vinculaciones obtenidas exitosamente' })
  misVinculaciones(@Request() req: { user: CurrentUser }) {
    return this.planteamientosService.misVinculaciones(req.user.id);
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.GESTOR_VCM,
    Role.ENCARGADO_CARRERA,
    Role.DECANO,
  )
  @ApiOperation({ summary: 'Listar todos los planteamientos (filtrado automático por rol)' })
  @ApiOkResponse({ description: 'Lista de planteamientos obtenida exitosamente' })
  findAll(
    @Query() query: QueryPlanteamientosDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.planteamientosService.findAll(query, req.user);
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.GESTOR_VCM,
    Role.ENCARGADO_CARRERA,
    Role.DOCENTE,
    Role.DECANO,
  )
  @ApiOperation({ summary: 'Obtener un planteamiento por ID' })
  @ApiOkResponse({ description: 'Planteamiento encontrado' })
  @ApiNotFoundResponse({ description: 'Planteamiento no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin permiso para ver este planteamiento' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: CurrentUser },
  ) {
    return this.planteamientosService.findOne(id, req.user);
  }

  @Post()
  @Roles(Role.DOCENTE, Role.ADMIN)
  @ApiOperation({ summary: 'Crear un planteamiento para una solicitud APROBADA' })
  @ApiCreatedResponse({ description: 'Planteamiento creado' })
  @ApiNotFoundResponse({ description: 'Solicitud no encontrada' })
  @ApiBadRequestResponse({ description: 'Solicitud no está APROBADA o ya tiene planteamiento' })
  create(
    @Body() dto: CreatePlanteamientoDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.planteamientosService.create(dto, req.user.id);
  }

  @Patch(':id')
  @Roles(Role.DOCENTE, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar un planteamiento (solo PENDIENTE para el docente)' })
  @ApiOkResponse({ description: 'Planteamiento actualizado' })
  @ApiNotFoundResponse({ description: 'Planteamiento no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin permiso para editar este planteamiento' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanteamientoDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.planteamientosService.update(id, dto, req.user);
  }

  @Patch(':id/gestionar')
  @Roles(Role.ENCARGADO_CARRERA, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprobar o rechazar un planteamiento (no se puede volver a PENDIENTE)' })
  @ApiOkResponse({ description: 'Planteamiento gestionado' })
  @ApiNotFoundResponse({ description: 'Planteamiento no encontrado' })
  @ApiBadRequestResponse({ description: 'Estado inválido (no puede ser PENDIENTE)' })
  gestionar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GestionarPlanteamientoDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.planteamientosService.gestionar(id, dto, req.user.id);
  }

  @Delete(':id')
  @Roles(Role.DOCENTE, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un planteamiento (solo PENDIENTE para el docente)' })
  @ApiOkResponse({ description: 'Planteamiento eliminado' })
  @ApiNotFoundResponse({ description: 'Planteamiento no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin permiso para eliminar este planteamiento' })
  @ApiBadRequestResponse({ description: 'No se puede eliminar: tiene proyecto asociado' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: CurrentUser },
  ) {
    return this.planteamientosService.remove(id, req.user);
  }

  @Post(':id/archivos')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir un archivo a un planteamiento' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ description: 'Archivo subido exitosamente' })
  @ApiNotFoundResponse({ description: 'Planteamiento no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin permiso para agregar archivos a este planteamiento' })
  addArchivo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: CurrentUser },
  ) {
    return this.planteamientosService.addArchivo(id, file, req.user);
  }

  @Delete(':id/archivos/:archivoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un archivo de un planteamiento' })
  @ApiOkResponse({ description: 'Archivo eliminado exitosamente' })
  @ApiNotFoundResponse({ description: 'Planteamiento o archivo no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin permiso para eliminar archivos de este planteamiento' })
  removeArchivo(
    @Param('id', ParseIntPipe) id: number,
    @Param('archivoId', ParseIntPipe) archivoId: number,
    @Request() req: { user: CurrentUser },
  ) {
    return this.planteamientosService.removeArchivo(id, archivoId, req.user);
  }
}
