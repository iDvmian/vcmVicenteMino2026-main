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
  Req,
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
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

interface RequestWithUser {
  user: { id: number; email: string; rol: string };
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(
    Role.ADMIN,
    Role.GESTOR_VCM,
    Role.DECANO,
  )
  @ApiOperation({ summary: 'Listar todos los usuarios (paginado, con filtros opcionales)' })
  @ApiOkResponse({ description: 'Lista de usuarios obtenida exitosamente' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  // IMPORTANTE: las rutas 'me' van antes que ':id' para que no se interpreten como un id.
  @Get('me')
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  @ApiOkResponse({ description: 'Perfil obtenido exitosamente' })
  findMe(@Req() req: RequestWithUser) {
    return this.usersService.findOne(req.user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar el perfil propio (no permite cambiar RUT, rol ni estado)' })
  @ApiOkResponse({ description: 'Perfil actualizado exitosamente' })
  @ApiConflictResponse({ description: 'El email ya está en uso' })
  updateMe(@Req() req: RequestWithUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiOkResponse({ description: 'Usuario encontrado' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo usuario (solo ADMIN)' })
  @ApiCreatedResponse({ description: 'Usuario creado exitosamente' })
  @ApiConflictResponse({ description: 'El email o RUT ya está registrado' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar un usuario por ID (solo ADMIN)' })
  @ApiOkResponse({ description: 'Usuario actualizado exitosamente' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  @ApiConflictResponse({ description: 'El email o RUT ya está en uso' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un usuario por ID (solo ADMIN)' })
  @ApiOkResponse({ description: 'Usuario eliminado exitosamente' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  @ApiBadRequestResponse({ description: 'No puedes eliminarte a ti mismo' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.usersService.remove(id, req.user.id);
  }
}
