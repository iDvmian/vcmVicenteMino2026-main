import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Carrera } from '../models/carrera.model';
import { PaginatedResponse } from '../models/paginated-response.model';

function buildParams(obj: Record<string, any>): HttpParams {
  let p = new HttpParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) p = p.set(k, String(v));
  });
  return p;
}

@Injectable({ providedIn: 'root' })
export class CarrerasService {
  private readonly apiUrl = `${environment.apiUrl}/carreras`;

  constructor(private http: HttpClient) {}

  getCarreras(params: { facultadId?: number; page?: number; limit?: number } = {}): Observable<PaginatedResponse<Carrera>> {
    return this.http
      .get<any>(this.apiUrl, { params: buildParams(params) })
      .pipe(map(r => r.data));
  }

  getCarrera(id: number): Observable<Carrera> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`)
      .pipe(map(r => r.data));
  }

  crearCarrera(dto: { nombre: string; etiqueta: string; facultadId: number }): Observable<Carrera> {
    return this.http
      .post<any>(this.apiUrl, dto)
      .pipe(map(r => r.data));
  }

  actualizarCarrera(id: number, dto: Partial<{ nombre: string; etiqueta: string; facultadId: number }>): Observable<Carrera> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}`, dto)
      .pipe(map(r => r.data));
  }

  eliminarCarrera(id: number): Observable<void> {
    return this.http
      .delete<any>(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }
}
