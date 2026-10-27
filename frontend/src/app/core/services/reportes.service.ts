import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';
import { EstadoProyecto } from '../models/proyecto.model';
import { Dashboard, DashboardFiltros } from '../models/dashboard.model';
import { CatalogoReporte, ReporteFiltros, ReporteVistaPrevia } from '../models/reporte.model';

function buildParams(obj: Record<string, any>): HttpParams {
  let p = new HttpParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) p = p.set(k, String(v));
  });
  return p;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly apiUrl = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  getDashboard(filtros: DashboardFiltros = {}): Observable<Dashboard> {
    return this.http
      .get<any>(`${this.apiUrl}/dashboard`, { params: buildParams(filtros) })
      .pipe(map((r) => r.data));
  }

  getCatalogoReportes(): Observable<CatalogoReporte[]> {
    return this.http.get<any>(`${this.apiUrl}/catalogo`).pipe(map((r) => r.data));
  }

  getVistaPreviaReporte(filtros: ReporteFiltros): Observable<ReporteVistaPrevia> {
    return this.http
      .get<any>(`${this.apiUrl}/datos`, { params: buildParams(filtros) })
      .pipe(map((r) => r.data));
  }

  // PDF binario: responseType 'blob', sin map(r => r.data)
  descargarReportePdf(filtros: ReporteFiltros): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/pdf`, {
      params: buildParams(filtros),
      responseType: 'blob',
    });
  }

  // El endpoint devuelve un PDF binario (attachment), NO un envelope JSON:
  // por eso se usa responseType: 'blob' y NO se aplica pipe(map(r => r.data)).
  descargarReporteProyectos(
    filtros: { estado?: EstadoProyecto | null; carreraId?: number | null } = {},
  ): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/proyectos`, {
      params: buildParams(filtros),
      responseType: 'blob',
    });
  }
}
