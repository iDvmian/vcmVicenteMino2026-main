import { Carrera } from './carrera.model';

export interface Facultad {
  id: number;
  nombre: string;
  etiqueta: string;
  carreras?: Carrera[];
  createdAt: string;
}
