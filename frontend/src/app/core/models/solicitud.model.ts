import { Carrera } from './carrera.model';

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export type OrigenSolicitud = 'EXTERNA' | 'DOCENTE';

export type TipoCliente =
  | 'JUNTA_VECINOS' | 'ONG' | 'ESTABLECIMIENTO_EDUCACIONAL' | 'EMPRESA_PRIVADA'
  | 'ORGANISMO_PUBLICO' | 'PERSONA_NATURAL' | 'OTRO';

export const TIPO_CLIENTE_LABELS: Record<TipoCliente, string> = {
  JUNTA_VECINOS: 'Junta de vecinos',
  ONG: 'ONG, fundación u organización social',
  ESTABLECIMIENTO_EDUCACIONAL: 'Escuela, liceo o colegio',
  EMPRESA_PRIVADA: 'Empresa o sector privado',
  ORGANISMO_PUBLICO: 'Municipalidad u organismo público',
  PERSONA_NATURAL: 'Persona natural',
  OTRO: 'Otro',
};

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
  direccion?: string;
  numeroDireccion?: string;
  telefono?: string | null;
  estado: EstadoSolicitud;
  motivoRechazo?: string | null;
  tipoCliente?: TipoCliente | null;
  tipoClienteOtro?: string | null;
  origen?: OrigenSolicitud;
  nombreOrganizacion?: string | null;
  personasPrevistas?: number | null;
  carreraId?: number;
  carrera?: Pick<Carrera, 'id' | 'nombre' | 'etiqueta'>;
  clienteId: number;
  cliente?: { id: number; nombres: string; apellidos: string; email: string };
  archivos: ArchivoSolicitud[];
  createdAt: string;
  updatedAt: string;
}
