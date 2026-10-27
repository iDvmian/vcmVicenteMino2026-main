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
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { GestionarSolicitudDto } from './dto/gestionar-solicitud.dto';
import { QuerySolicitudesDto } from './dto/query-solicitudes.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud.dto';
import { SolicitudesService } from './solicitudes.service';

@ApiTags('solicitudes')
@ApiBearerAuth()
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  // IMPORTANTE: /mis-solicitudes debe ir antes de /:id para evitar colisiones de rutas
  @Get('mis-solicitudes')
  @Roles(
    Role.ADMIN,
    Role.GESTOR_VCM,
    Role.ENCARGADO_CARRERA,
    Role.DOCENTE,
    Role.DECANO,
    Role.CLIENTE,
  )
  @ApiOperation({ summary: 'Obtener mis solicitudes (cualquier rol ve las suyas)' })
  @ApiOkResponse({ description: 'Lista de solicitudes propias obtenida exitosamente' })
  findMisSolicitudes(
    @Query() query: QuerySolicitudesDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.solicitudesService.findMisSolicitudes(req.user.id, query);
  }

  // Debe ir antes de /:id
  @Get('mi-resumen')
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Resumen y seguimiento de las solicitudes del solicitante' })
  @ApiOkResponse({ description: 'Resumen obtenido exitosamente' })
  miResumen(@Request() req: { user: CurrentUser }) {
    return this.solicitudesService.miResumen(req.user.id);
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.GESTOR_VCM,
    Role.ENCARGADO_CARRERA,
    Role.DOCENTE,
    Role.DECANO,
    Role.DIRECTOR_VCM,
  )
  @ApiOperation({ summary: 'Listar todas las solicitudes (filtrado automático por rol)' })
  @ApiOkResponse({ description: 'Lista de solicitudes obtenida exitosamente' })
  findAll(
    @Query() query: QuerySolicitudesDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.solicitudesService.findAll(query, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una solicitud por ID' })
  @ApiOkResponse({ description: 'Solicitud encontrada' })
  @ApiNotFoundResponse({ description: 'Solicitud no encontrada' })
  @ApiForbiddenResponse({ description: 'Sin permiso para ver esta solicitud' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: CurrentUser },
  ) {
    return this.solicitudesService.findOne(id, req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una solicitud' })
  @ApiCreatedResponse({ description: 'Solicitud creada' })
  @ApiNotFoundResponse({ description: 'Carrera no encontrada' })
  create(
    @Body() dto: CreateSolicitudDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.solicitudesService.create(dto, req.user);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar una solicitud (solo PENDIENTE para el dueño)' })
  @ApiOkResponse({ description: 'Solicitud actualizada' })
  @ApiNotFoundResponse({ description: 'Solicitud o carrera no encontrada' })
  @ApiForbiddenResponse({ description: 'Sin permiso para editar esta solicitud' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSolicitudDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.solicitudesService.update(id, dto, req.user);
  }

  @Post(':id/editando')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'El solicitante avisa que está editando su solicitud (se renueva cada ~30 s)' })
  @ApiOkResponse({ description: 'Marca renovada' })
  marcarEdicion(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: CurrentUser },
  ) {
    return this.solicitudesService.marcarEdicion(id, req.user);
  }

  @Delete(':id/editando')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'El solicitante terminó de editar: libera la marca' })
  @ApiOkResponse({ description: 'Marca liberada' })
  liberarEdicion(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: CurrentUser },
  ) {
    return this.solicitudesService.liberarEdicion(id, req.user);
  }

  @Patch(':id/gestionar')
  @Roles(Role.ADMIN, Role.GESTOR_VCM)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprobar, rechazar o vincular una solicitud a una carrera' })
  @ApiOkResponse({ description: 'Solicitud gestionada' })
  @ApiNotFoundResponse({ description: 'Solicitud o carrera no encontrada' })
  gestionar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GestionarSolicitudDto,
    @Request() req: { user: CurrentUser },
  ) {
    return this.solicitudesService.gestionar(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una solicitud (solo PENDIENTE para el dueño)' })
  @ApiOkResponse({ description: 'Solicitud eliminada' })
  @ApiNotFoundResponse({ description: 'Solicitud no encontrada' })
  @ApiForbiddenResponse({ description: 'Sin permiso para eliminar esta solicitud' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: CurrentUser },
  ) {
    return this.solicitudesService.remove(id, req.user);
  }

  @Post(':id/archivos')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir un archivo a una solicitud' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ description: 'Archivo subido exitosamente' })
  @ApiNotFoundResponse({ description: 'Solicitud no encontrada' })
  @ApiForbiddenResponse({ description: 'Sin permiso para agregar archivos a esta solicitud' })
  addArchivo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: CurrentUser },
  ) {
    return this.solicitudesService.addArchivo(id, file, req.user);
  }

  @Delete(':id/archivos/:archivoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un archivo de una solicitud' })
  @ApiOkResponse({ description: 'Archivo eliminado exitosamente' })
  @ApiNotFoundResponse({ description: 'Solicitud o archivo no encontrado' })
  @ApiForbiddenResponse({ description: 'Sin permiso para eliminar archivos de esta solicitud' })
  removeArchivo(
    @Param('id', ParseIntPipe) id: number,
    @Param('archivoId', ParseIntPipe) archivoId: number,
    @Request() req: { user: CurrentUser },
  ) {
    return this.solicitudesService.removeArchivo(id, archivoId, req.user);
  }
}
