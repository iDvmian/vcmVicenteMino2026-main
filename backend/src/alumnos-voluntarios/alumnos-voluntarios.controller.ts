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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AlumnosVoluntariosService } from './alumnos-voluntarios.service';
import { CreateAlumnoVoluntarioDto } from './dto/create-alumno-voluntario.dto';
import { QueryAlumnosVoluntariosDto } from './dto/query-alumnos-voluntarios.dto';
import { UpdateAlumnoVoluntarioDto } from './dto/update-alumno-voluntario.dto';

@ApiTags('alumnos-voluntarios')
@ApiBearerAuth()
@Controller('alumnos-voluntarios')
export class AlumnosVoluntariosController {
  constructor(private readonly alumnosVoluntariosService: AlumnosVoluntariosService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GESTOR_VCM, Role.ENCARGADO_CARRERA, Role.DOCENTE, Role.DECANO)
  @ApiOperation({ summary: 'Listar alumnos voluntarios (paginado, filtros por carrera y estado)' })
  @ApiOkResponse({ description: 'Lista de alumnos voluntarios obtenida exitosamente' })
  findAll(@Query() query: QueryAlumnosVoluntariosDto) {
    return this.alumnosVoluntariosService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GESTOR_VCM, Role.ENCARGADO_CARRERA, Role.DOCENTE, Role.DECANO)
  @ApiOperation({ summary: 'Obtener un alumno voluntario por ID' })
  @ApiOkResponse({ description: 'Alumno voluntario encontrado' })
  @ApiNotFoundResponse({ description: 'Alumno voluntario no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.alumnosVoluntariosService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ENCARGADO_CARRERA)
  @ApiOperation({ summary: 'Crear un alumno voluntario' })
  @ApiCreatedResponse({ description: 'Alumno voluntario creado' })
  @ApiConflictResponse({ description: 'RUT o email ya registrado' })
  @ApiNotFoundResponse({ description: 'Carrera no encontrada' })
  create(@Body() dto: CreateAlumnoVoluntarioDto) {
    return this.alumnosVoluntariosService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ENCARGADO_CARRERA)
  @ApiOperation({ summary: 'Actualizar un alumno voluntario por ID (solo ADMIN, ENCARGADO_CARRERA)' })
  @ApiOkResponse({ description: 'Alumno voluntario actualizado' })
  @ApiNotFoundResponse({ description: 'Alumno voluntario o carrera no encontrada' })
  @ApiConflictResponse({ description: 'Email ya en uso' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAlumnoVoluntarioDto) {
    return this.alumnosVoluntariosService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.ENCARGADO_CARRERA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un alumno voluntario por ID (solo ADMIN, ENCARGADO_CARRERA)' })
  @ApiOkResponse({ description: 'Alumno voluntario eliminado' })
  @ApiNotFoundResponse({ description: 'Alumno voluntario no encontrado' })
  @ApiBadRequestResponse({ description: 'No se puede eliminar: tiene proyectos asignados' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.alumnosVoluntariosService.remove(id);
  }
}
