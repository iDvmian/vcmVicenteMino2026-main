export interface Carrera {
  id: number;
  nombre: string;
  etiqueta: string;
  facultadId: number;
  facultad?: { id: number; nombre: string; etiqueta: string };
  createdAt: string;
}
