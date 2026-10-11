import { Module } from '@nestjs/common';
import { AlumnosVoluntariosController } from './alumnos-voluntarios.controller';
import { AlumnosVoluntariosService } from './alumnos-voluntarios.service';

@Module({
  controllers: [AlumnosVoluntariosController],
  providers: [AlumnosVoluntariosService],
  exports: [AlumnosVoluntariosService],
})
export class AlumnosVoluntariosModule {}
