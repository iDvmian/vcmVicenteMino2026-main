import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Proyecto, Observacion, EstadoProyecto } from '../models/proyecto.model';
import { PaginatedResponse } from '../models/paginated-response.model';

export interface CreateProyectoDto {
  planteamientoId: number;
  fechaInicio: string;
  fechaFin: string;
  alumnoIds?: number[];
}

export interface UpdateProyectoDto {
  fechaInicio?: string;
  fechaFin?: string;
  alumnoIds?: number[];
}

export interface UpdateEstadoProyectoDto {
  estado: EstadoProyecto;
}

export interface CreateObservacionDto {
  descripcion: string;
}

function buildParams(obj: Record<string, any>): HttpParams {
  let p = new HttpParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) p = p.set(k, String(v));
  });
  return p;
}

@Injectable({ providedIn: 'root' })
export class ProyectosService {
  private readonly apiUrl = `${environment.apiUrl}/proyectos`;

  constructor(private http: HttpClient) {}

  getMisProyectos(
    params: { estado?: EstadoProyecto | null; page?: number; limit?: number } = {},
  ): Observable<PaginatedResponse<Proyecto>> {
    return this.http
      .get<any>(`${this.apiUrl}/mis-proyectos`, { params: buildParams(params) })
      .pipe(map(r => r.data));
  }

  getAll(
    params: { estado?: EstadoProyecto | null; page?: number; limit?: number } = {},
  ): Observable<PaginatedResponse<Proyecto>> {
    return this.http
      .get<any>(this.apiUrl, { params: buildParams(params) })
      .pipe(map(r => r.data));
  }

  getById(id: number): Observable<Proyecto> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`)
      .pipe(map(r => r.data));
  }

  create(dto: CreateProyectoDto): Observable<Proyecto> {
    return this.http
      .post<any>(this.apiUrl, dto)
      .pipe(map(r => r.data));
  }

  update(id: number, dto: UpdateProyectoDto): Observable<Proyecto> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}`, dto)
      .pipe(map(r => r.data));
  }

  updateEstado(id: number, dto: UpdateEstadoProyectoDto): Observable<Proyecto> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}/estado`, dto)
      .pipe(map(r => r.data));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<any>(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  getObservaciones(proyectoId: number): Observable<Observacion[]> {
    return this.http
      .get<any>(`${this.apiUrl}/${proyectoId}/observaciones`)
      .pipe(map(r => r.data));
  }

  addObservacion(proyectoId: number, dto: CreateObservacionDto): Observable<Observacion> {
    return this.http
      .post<any>(`${this.apiUrl}/${proyectoId}/observaciones`, dto)
      .pipe(map(r => r.data));
  }

  removeObservacion(proyectoId: number, obsId: number): Observable<void> {
    return this.http
      .delete<any>(`${this.apiUrl}/${proyectoId}/observaciones/${obsId}`)
      .pipe(map(() => void 0));
  }
}
