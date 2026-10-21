import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, Role } from '../models/user.model';
import { PaginatedResponse } from '../models/paginated-response.model';

function buildParams(obj: Record<string, any>): HttpParams {
  let p = new HttpParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) p = p.set(k, String(v));
  });
  return p;
}

export interface CreateUsuarioDto {
  rut: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string;
  password: string;
  rol: Role;
  carreraId?: number | null;
}

export interface UpdatePerfilDto {
  nombres?: string;
  apellidos?: string;
  email?: string;
  telefono?: string | null;
}

export interface UpdateUsuarioDto {
  nombres?: string;
  apellidos?: string;
  email?: string;
  telefono?: string | null;
  rol?: Role;
  estado?: boolean;
  carreraId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getUsuarios(params: { rol?: Role; estado?: boolean; page?: number; limit?: number } = {}): Observable<PaginatedResponse<User>> {
    return this.http
      .get<any>(this.apiUrl, { params: buildParams(params) })
      .pipe(map(r => r.data));
  }

  getMiPerfil(): Observable<User> {
    return this.http.get<any>(`${this.apiUrl}/me`).pipe(map(r => r.data));
  }

  actualizarMiPerfil(dto: UpdatePerfilDto): Observable<User> {
    return this.http.patch<any>(`${this.apiUrl}/me`, dto).pipe(map(r => r.data));
  }

  getUsuario(id: number): Observable<User> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`)
      .pipe(map(r => r.data));
  }

  crearUsuario(dto: CreateUsuarioDto): Observable<User> {
    return this.http
      .post<any>(this.apiUrl, dto)
      .pipe(map(r => r.data));
  }

  actualizarUsuario(id: number, dto: UpdateUsuarioDto): Observable<User> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}`, dto)
      .pipe(map(r => r.data));
  }

  eliminarUsuario(id: number): Observable<void> {
    return this.http
      .delete<any>(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }
}
