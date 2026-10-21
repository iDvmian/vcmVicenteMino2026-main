export interface DashboardResumen {
  solicitudes: {
    total: number; pendientes: number; aprobadas: number; rechazadas: number;
    pctAprobadas: number; pctRechazadas: number; pctPendientes: number;
  };
  planteamientos: { total: number; PENDIENTE: number; APROBADO: number; RECHAZADO: number };
  proyectos: {
    total: number; enProceso: number; pausados: number; finalizados: number; cancelados: number;
    pctFinalizados: number;
  };
  tasaConversion: number;
  horasHombre: number;
  participantes: { docentes: number; estudiantes: number; externos: number; total: number };
  alumnosVoluntarios: number;
  duracionPromedioDias: number | null;
  tiempoRespuestaPromedioDias: number | null;
}

export interface Dashboard {
  resumen: DashboardResumen;
  porMes: { mes: string; solicitudes: number; proyectos: number }[];
  porTipoIntervencion: { tipo: string; planteamientos: number; proyectos: number; horasHombre: number }[];
  porCarrera: { carrera: string; etiqueta: string; solicitudes: number; proyectos: number }[];
  porComuna: { comuna: string; solicitudes: number }[];
  rankingDocentes: { docente: string; planteamientos: number; aprobados: number; proyectos: number; horasHombre: number }[];
  rankingAlumnos: { alumno: string; proyectos: number }[];
}

export interface DashboardFiltros {
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  carreraId?: number | null;
  tipoIntervencion?: string | null;
}
