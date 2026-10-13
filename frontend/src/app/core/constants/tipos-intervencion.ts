/**
 * Tipos de intervención de vinculación con el medio.
 * Deben coincidir con el enum TipoIntervencion del backend (schema.prisma).
 */
export type TipoIntervencion =
  | 'CHARLA'
  | 'TALLER'
  | 'CURSO_CAPACITACION'
  | 'SEMINARIO'
  | 'ASESORIA_TECNICA'
  | 'OPERATIVO_TERRENO'
  | 'APRENDIZAJE_SERVICIO'
  | 'ACTIVIDAD_CULTURAL'
  | 'VOLUNTARIADO'
  | 'INVESTIGACION_APLICADA'
  | 'OTRO';

export const TIPOS_INTERVENCION: { label: string; value: TipoIntervencion }[] = [
  { label: 'Charla o conferencia', value: 'CHARLA' },
  { label: 'Taller', value: 'TALLER' },
  { label: 'Curso de capacitación', value: 'CURSO_CAPACITACION' },
  { label: 'Seminario o jornada', value: 'SEMINARIO' },
  { label: 'Asesoría o asistencia técnica', value: 'ASESORIA_TECNICA' },
  { label: 'Operativo o actividad en terreno', value: 'OPERATIVO_TERRENO' },
  { label: 'Proyecto de aprendizaje-servicio', value: 'APRENDIZAJE_SERVICIO' },
  { label: 'Actividad cultural o artística', value: 'ACTIVIDAD_CULTURAL' },
  { label: 'Voluntariado', value: 'VOLUNTARIADO' },
  { label: 'Investigación o estudio aplicado', value: 'INVESTIGACION_APLICADA' },
  { label: 'Otro', value: 'OTRO' },
];

export function tipoIntervencionLabel(
  tipo?: TipoIntervencion | null,
  otro?: string | null,
): string {
  if (!tipo) return '—';
  if (tipo === 'OTRO' && otro) return `Otro: ${otro}`;
  return TIPOS_INTERVENCION.find((t) => t.value === tipo)?.label ?? tipo;
}

/** Unidad de la duración de ejecución (coincide con el enum UnidadDuracion del backend). */
export type UnidadDuracion = 'DIAS' | 'SEMANAS' | 'MESES';

export const UNIDADES_DURACION: { label: string; value: UnidadDuracion }[] = [
  { label: 'Días', value: 'DIAS' },
  { label: 'Semanas', value: 'SEMANAS' },
  { label: 'Meses', value: 'MESES' },
];
