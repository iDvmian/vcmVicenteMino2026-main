import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AlumnoVoluntario } from '../models/alumno-voluntario.model';
import { PaginatedResponse } from '../models/paginated-response.model';

export interface CreateAlumnoDto {
  rut: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string | null;
  carreraId: number;
}

export interface UpdateAlumnoDto {
  nombres?: string;
  apellidos?: string;
  email?: string;
  telefono?: string | null;
  carreraId?: number;
  estado?: boolean;
}

function buildParams(obj: Record<string, any>): HttpParams {
  let p = new HttpParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) p = p.set(k, String(v));
  });
  return p;
}

@Injectable({ providedIn: 'root' })
export class AlumnosVoluntariosService {
  private readonly apiUrl = `${environment.apiUrl}/alumnos-voluntarios`;

  constructor(private http: HttpClient) {}

  getAll(params: { carreraId?: number; estado?: boolean; page?: number; limit?: number } = {}): Observable<PaginatedResponse<AlumnoVoluntario>> {
    return this.http
      .get<any>(this.apiUrl, { params: buildParams(params) })
      .pipe(map(r => r.data));
  }

  getById(id: number): Observable<AlumnoVoluntario> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`)
      .pipe(map(r => r.data));
  }

  create(dto: CreateAlumnoDto): Observable<AlumnoVoluntario> {
    return this.http
      .post<any>(this.apiUrl, dto)
      .pipe(map(r => r.data));
  }

  update(id: number, dto: UpdateAlumnoDto): Observable<AlumnoVoluntario> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}`, dto)
      .pipe(map(r => r.data));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<any>(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }
}
