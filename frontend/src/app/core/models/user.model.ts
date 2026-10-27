export type Role =
  | 'ADMIN'
  | 'GESTOR_VCM'
  | 'ENCARGADO_CARRERA'
  | 'DOCENTE'
  | 'DECANO'
  | 'DIRECTOR_VCM'
  | 'CLIENTE';

export interface User {
  id: number;
  rut: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string | null;
  rol: Role;
  estado: boolean;
  carreraId?: number | null;
  /** Facultad del Decano (solo ve la información de esa facultad). */
  facultadId?: number | null;
  facultad?: { id: number; nombre: string; etiqueta: string } | null;
  carrera?: {
    id: number;
    nombre: string;
    etiqueta: string;
    facultad?: { etiqueta: string };
  } | null;
  createdAt?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
