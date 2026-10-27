import { TipoIntervencion } from '../constants/tipos-intervencion';

/** Agrupación para filtrar: en qué punto del ciclo está la vinculación. */
export type GrupoVinculacion = 'TRAMITE' | 'CURSO' | 'FINALIZADA' | 'CANCELADA' | 'RECHAZADA';

export interface Vinculacion {
  planteamientoId: number;
  proyectoId: number | null;
  titulo: string;
  organizacion: string;
  ciudad: string | null;
  carrera: string | null;
  tipoIntervencion: TipoIntervencion | null;
  tipoIntervencionOtro: string | null;
  grupo: GrupoVinculacion;
  etapa: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  anio: number;
  participantes: number;
  horasHombre: number;
}
