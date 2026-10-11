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
import { CreateFacultadDto } from './dto/create-facultad.dto';
import { QueryFacultadesDto } from './dto/query-facultades.dto';
import { UpdateFacultadDto } from './dto/update-facultad.dto';
import { FacultadesService } from './facultades.service';

@ApiTags('Facultades')
@ApiBearerAuth()
@Controller('facultades')
export class FacultadesController {
  constructor(private readonly facultadesService: FacultadesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las facultades (paginado)' })
  @ApiOkResponse({ description: 'Lista de facultades obtenida exitosamente' })
  findAll(@Query() query: QueryFacultadesDto) {
    return this.facultadesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una facultad por ID (incluye sus carreras)' })
  @ApiOkResponse({ description: 'Facultad encontrada' })
  @ApiNotFoundResponse({ description: 'Facultad no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.facultadesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear una nueva facultad (solo ADMIN)' })
  @ApiCreatedResponse({ description: 'Facultad creada exitosamente' })
  @ApiConflictResponse({ description: 'La etiqueta ya está en uso' })
  create(@Body() dto: CreateFacultadDto) {
    return this.facultadesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar una facultad por ID (solo ADMIN)' })
  @ApiOkResponse({ description: 'Facultad actualizada exitosamente' })
  @ApiNotFoundResponse({ description: 'Facultad no encontrada' })
  @ApiConflictResponse({ description: 'La etiqueta ya está en uso' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFacultadDto) {
    return this.facultadesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una facultad por ID (solo ADMIN)' })
  @ApiOkResponse({ description: 'Facultad eliminada exitosamente' })
  @ApiNotFoundResponse({ description: 'Facultad no encontrada' })
  @ApiBadRequestResponse({ description: 'No se puede eliminar: la facultad tiene carreras asociadas' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.facultadesService.remove(id);
  }
}
