import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstadoProyecto } from '../models/proyecto.model';

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
