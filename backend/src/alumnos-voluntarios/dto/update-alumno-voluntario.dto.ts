import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAlumnoVoluntarioDto } from './create-alumno-voluntario.dto';

export class UpdateAlumnoVoluntarioDto extends PartialType(CreateAlumnoVoluntarioDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
