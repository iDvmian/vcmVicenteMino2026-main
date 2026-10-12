import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Solicitud, EstadoSolicitud } from '../models/solicitud.model';
import { PaginatedResponse } from '../models/paginated-response.model';

export interface CreateSolicitudDto {
  titulo: string;
  descripcion: string;
  ciudad: string;
  direccion: string;
  numeroDireccion?: string;
  carreraId?: number;
}

export interface UpdateSolicitudDto {
  titulo?: string;
  descripcion?: string;
  ciudad?: string;
  direccion?: string;
  numeroDireccion?: string | null;
  carreraId?: number;
}

export interface GestionarSolicitudDto {
  estado: EstadoSolicitud;
  carreraId?: number;
}

function buildParams(obj: Record<string, any>): HttpParams {
  let p = new HttpParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) p = p.set(k, String(v));
  });
  return p;
}

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private readonly apiUrl = `${environment.apiUrl}/solicitudes`;

  constructor(private http: HttpClient) {}

  getMisSolicitudes(
    params: { estado?: EstadoSolicitud | null; page?: number; limit?: number } = {},
  ): Observable<PaginatedResponse<Solicitud>> {
    return this.http
      .get<any>(`${this.apiUrl}/mis-solicitudes`, { params: buildParams(params) })
      .pipe(map(r => r.data));
  }

  getAll(
    params: {
      estado?: EstadoSolicitud | null;
      carreraId?: number | null;
      facultadId?: number | null;
      ciudad?: string | null;
      fechaDesde?: string | null;
      fechaHasta?: string | null;
      solicitante?: string | null;
      orden?: 'recientes' | 'antiguas';
      page?: number;
      limit?: number;
    } = {},
  ): Observable<PaginatedResponse<Solicitud>> {
    return this.http
      .get<any>(this.apiUrl, { params: buildParams(params) })
      .pipe(map(r => r.data));
  }

  getById(id: number): Observable<Solicitud> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`)
      .pipe(map(r => r.data));
  }

  create(dto: CreateSolicitudDto): Observable<Solicitud> {
    return this.http
      .post<any>(this.apiUrl, dto)
      .pipe(map(r => r.data));
  }

  update(id: number, dto: UpdateSolicitudDto): Observable<Solicitud> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}`, dto)
      .pipe(map(r => r.data));
  }

  gestionar(id: number, dto: GestionarSolicitudDto): Observable<Solicitud> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}/gestionar`, dto)
      .pipe(map(r => r.data));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<any>(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  addArchivo(solicitudId: number, file: File): Observable<Solicitud> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<any>(`${this.apiUrl}/${solicitudId}/archivos`, formData)
      .pipe(map(r => r.data));
  }

  removeArchivo(solicitudId: number, archivoId: number): Observable<void> {
    return this.http
      .delete<any>(`${this.apiUrl}/${solicitudId}/archivos/${archivoId}`)
      .pipe(map(() => void 0));
  }
}
