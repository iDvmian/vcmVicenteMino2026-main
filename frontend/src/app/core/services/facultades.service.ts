import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Facultad } from '../models/facultad.model';
import { PaginatedResponse } from '../models/paginated-response.model';

function buildParams(obj: Record<string, any>): HttpParams {
  let p = new HttpParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) p = p.set(k, String(v));
  });
  return p;
}

@Injectable({ providedIn: 'root' })
export class FacultadesService {
  private readonly apiUrl = `${environment.apiUrl}/facultades`;

  constructor(private http: HttpClient) {}

  getFacultades(params: { page?: number; limit?: number } = {}): Observable<PaginatedResponse<Facultad>> {
    return this.http
      .get<any>(this.apiUrl, { params: buildParams(params) })
      .pipe(map(r => r.data));
  }

  getFacultad(id: number): Observable<Facultad> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`)
      .pipe(map(r => r.data));
  }

  crearFacultad(dto: { nombre: string; etiqueta: string }): Observable<Facultad> {
    return this.http
      .post<any>(this.apiUrl, dto)
      .pipe(map(r => r.data));
  }

  actualizarFacultad(id: number, dto: Partial<{ nombre: string; etiqueta: string }>): Observable<Facultad> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}`, dto)
      .pipe(map(r => r.data));
  }

  eliminarFacultad(id: number): Observable<void> {
    return this.http
      .delete<any>(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }
}
