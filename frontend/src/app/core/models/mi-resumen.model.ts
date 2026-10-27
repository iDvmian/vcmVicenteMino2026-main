import { EstadoSolicitud } from './solicitud.model';

export interface PasoSeguimiento {
  clave: string;
  label: string;
  fecha: string | null;
  estado: 'hecho' | 'actual' | 'pendiente' | 'rechazado';
}

export interface SolicitudResumen {
  id: number;
  titulo: string;
  estado: EstadoSolicitud;
  motivoRechazo: string | null;
  createdAt: string;
  pasos: PasoSeguimiento[];
}

export interface MiResumen {
  total: number;
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
  solicitudes: SolicitudResumen[];
}
