import { Planteamiento } from './planteamiento.model';
import { AlumnoVoluntario } from './alumno-voluntario.model';

export type EstadoProyecto = 'EN_PROCESO' | 'PAUSADO' | 'FINALIZADO' | 'CANCELADO';

export interface Observacion {
  id: number;
  descripcion: string;
  proyectoId: number;
  autorId: number;
  autor?: {
    id: number;
    nombres: string;
    apellidos: string;
    email?: string;
  };
  createdAt: string;
}

// El backend devuelve los alumnos asignados como registros de la tabla intermedia
// ProyectoAlumno (cada uno con el alumno anidado), NO como un AlumnoVoluntario[] plano.
// Verificado en backend/src/proyectos/proyectos.service.ts → PROYECTO_INCLUDE.alumnos.
export interface ProyectoAlumno {
  proyectoId: number;
  alumnoId: number;
  alumno: AlumnoVoluntario;
}

export interface ArchivoProyecto {
  id: number;
  url: string;
  publicId: string;
  nombre: string;
  proyectoId: number;
  createdAt: string;
}

export interface Proyecto {
  id: number;
  estado: EstadoProyecto;
  fechaInicio: string;
  fechaFin: string;
  participantesDocentes?: number | null;
  participantesEstudiantes?: number | null;
  participantesExternos?: number | null;
  planteamientoId: number;
  // El docente y la carrera NO vienen a nivel raíz: se derivan de
  // planteamiento.docente / planteamiento.solicitud.carrera respectivamente.
  planteamiento?: Planteamiento;
  alumnos?: ProyectoAlumno[];
  observaciones?: Observacion[];
  archivos?: ArchivoProyecto[];
  createdAt: string;
  updatedAt: string;
}
