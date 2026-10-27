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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/strategies/jwt.strategy';
import { CarrerasService } from './carreras.service';
import { CreateCarreraDto } from './dto/create-carrera.dto';
import { QueryCarrerasDto } from './dto/query-carreras.dto';
import { UpdateCarreraDto } from './dto/update-carrera.dto';

@ApiTags('Carreras')
@ApiBearerAuth()
@Controller('carreras')
export class CarrerasController {
  constructor(private readonly carrerasService: CarrerasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las carreras (paginado, filtro opcional por facultad)' })
  @ApiOkResponse({ description: 'Lista de carreras obtenida exitosamente' })
  findAll(@Query() query: QueryCarrerasDto, @Request() req: { user: CurrentUser }) {
    return this.carrerasService.findAll(query, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una carrera por ID (incluye su facultad)' })
  @ApiOkResponse({ description: 'Carrera encontrada' })
  @ApiNotFoundResponse({ description: 'Carrera no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: { user: CurrentUser }) {
    return this.carrerasService.findOne(id, req.user);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear una nueva carrera (solo ADMIN)' })
  @ApiCreatedResponse({ description: 'Carrera creada exitosamente' })
  @ApiConflictResponse({ description: 'La etiqueta ya está en uso' })
  @ApiNotFoundResponse({ description: 'Facultad no encontrada' })
  create(@Body() dto: CreateCarreraDto) {
    return this.carrerasService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar una carrera por ID (solo ADMIN)' })
  @ApiOkResponse({ description: 'Carrera actualizada exitosamente' })
  @ApiNotFoundResponse({ description: 'Carrera o facultad no encontrada' })
  @ApiConflictResponse({ description: 'La etiqueta ya está en uso' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCarreraDto) {
    return this.carrerasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una carrera por ID (solo ADMIN)' })
  @ApiOkResponse({ description: 'Carrera eliminada exitosamente' })
  @ApiNotFoundResponse({ description: 'Carrera no encontrada' })
  @ApiBadRequestResponse({ description: 'No se puede eliminar: tiene usuarios o alumnos asociados' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.carrerasService.remove(id);
  }
}
