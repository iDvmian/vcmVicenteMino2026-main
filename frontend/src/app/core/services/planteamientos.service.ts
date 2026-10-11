import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Planteamiento, EstadoPlanteamiento } from '../models/planteamiento.model';
import { PaginatedResponse } from '../models/paginated-response.model';

export interface CreatePlanteamientoDto {
  solicitudId: number;
  descripcion: string;
  tiempoEstimado: string;
}

export interface UpdatePlanteamientoDto {
  descripcion?: string;
  tiempoEstimado?: string;
}

export interface GestionarPlanteamientoDto {
  estado: 'APROBADO' | 'RECHAZADO';
}

function buildParams(obj: Record<string, any>): HttpParams {
  let p = new HttpParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) p = p.set(k, String(v));
  });
  return p;
}

@Injectable({ providedIn: 'root' })
export class PlanteamientosService {
  private readonly apiUrl = `${environment.apiUrl}/planteamientos`;

  constructor(private http: HttpClient) {}

  getMisPlanteamientos(
    params: { estado?: EstadoPlanteamiento | null; solicitudId?: number | null; page?: number; limit?: number } = {},
  ): Observable<PaginatedResponse<Planteamiento>> {
    return this.http
      .get<any>(`${this.apiUrl}/mis-planteamientos`, { params: buildParams(params) })
      .pipe(map(r => r.data));
  }

  getAll(
    params: { estado?: EstadoPlanteamiento | null; solicitudId?: number | null; page?: number; limit?: number } = {},
  ): Observable<PaginatedResponse<Planteamiento>> {
    return this.http
      .get<any>(this.apiUrl, { params: buildParams(params) })
      .pipe(map(r => r.data));
  }

  getById(id: number): Observable<Planteamiento> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`)
      .pipe(map(r => r.data));
  }

  create(dto: CreatePlanteamientoDto): Observable<Planteamiento> {
    return this.http
      .post<any>(this.apiUrl, dto)
      .pipe(map(r => r.data));
  }

  update(id: number, dto: UpdatePlanteamientoDto): Observable<Planteamiento> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}`, dto)
      .pipe(map(r => r.data));
  }

  gestionar(id: number, dto: GestionarPlanteamientoDto): Observable<Planteamiento> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}/gestionar`, dto)
      .pipe(map(r => r.data));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<any>(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  addArchivo(planteamientoId: number, file: File): Observable<Planteamiento> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<any>(`${this.apiUrl}/${planteamientoId}/archivos`, formData)
      .pipe(map(r => r.data));
  }

  removeArchivo(planteamientoId: number, archivoId: number): Observable<void> {
    return this.http
      .delete<any>(`${this.apiUrl}/${planteamientoId}/archivos/${archivoId}`)
      .pipe(map(() => void 0));
  }
}
