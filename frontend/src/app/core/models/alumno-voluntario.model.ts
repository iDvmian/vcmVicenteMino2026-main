import { Carrera } from './carrera.model';

export interface AlumnoVoluntario {
  id: number;
  rut: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string | null;
  carreraId: number;
  carrera?: Carrera;
  estado: boolean;
  createdAt: string;
}
