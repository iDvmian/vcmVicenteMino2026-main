import { Carrera } from './carrera.model';

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface ArchivoSolicitud {
  id: number;
  url: string;
  publicId: string;
  nombre: string;
  solicitudId: number;
}

export interface Solicitud {
  id: number;
  titulo: string;
  descripcion: string;
  ciudad?: string;
  estado: EstadoSolicitud;
  carreraId?: number;
  carrera?: Pick<Carrera, 'id' | 'nombre' | 'etiqueta'>;
  clienteId: number;
  cliente?: { id: number; nombres: string; apellidos: string; email: string };
  archivos: ArchivoSolicitud[];
  createdAt: string;
  updatedAt: string;
}
