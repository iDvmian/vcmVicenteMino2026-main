import { Solicitud } from './solicitud.model';
import { TipoIntervencion, UnidadDuracion } from '../constants/tipos-intervencion';

export type EstadoPlanteamiento = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface ArchivoPlanteamiento {
  id: number;
  url: string;
  publicId: string;
  nombre: string;
  planteamientoId: number;
}

export interface Planteamiento {
  id: number;
  descripcion: string;
  tiempoEstimado: string;
  duracionCantidad?: number | null;
  duracionUnidad?: UnidadDuracion | null;
  horasHombre?: number | null;
  tipoIntervencion?: TipoIntervencion | null;
  tipoIntervencionOtro?: string | null;
  estado: EstadoPlanteamiento;
  motivoRechazo?: string | null;
  solicitudId: number;
  // El backend incluye la carrera de la solicitud; se expone aquí para poder
  // derivar la carrera del proyecto al asignar alumnos voluntarios.
  solicitud?: Pick<Solicitud, 'id' | 'titulo' | 'carreraId' | 'carrera'>;
  // Marcador de existencia: si el planteamiento ya tiene proyecto asociado,
  // el backend lo incluye. Permite filtrar planteamientos "sin proyecto aún".
  proyecto?: { id: number } | null;
  docenteId: number;
  docente?: {
    id: number;
    nombres: string;
    apellidos: string;
    email: string;
  };
  archivos: ArchivoPlanteamiento[];
  createdAt: string;
  updatedAt: string;
}
