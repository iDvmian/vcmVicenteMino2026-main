import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ReportesService } from '../../core/services/reportes.service';
import { CarrerasService } from '../../core/services/carreras.service';
import { FacultadesService } from '../../core/services/facultades.service';
import { AuthService } from '../../core/services/auth.service';
import { CatalogoReporte, ReporteFiltros, ReporteVistaPrevia, TipoReporte } from '../../core/models/reporte.model';
import { TIPOS_INTERVENCION } from '../../core/constants/tipos-intervencion';
import { COMUNAS_MAULE } from '../../core/constants/comunas-maule';

interface Opcion<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, DatePickerModule, ToastModule],
  providers: [MessageService],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss',
})
export class ReportesComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  readonly tiposReporte: { value: TipoReporte; label: string; icon: string; desc: string }[] = [
    { value: 'SOLICITUDES', label: 'Solicitudes', icon: 'ti-file-description', desc: 'Lo que piden las organizaciones' },
    { value: 'PLANTEAMIENTOS', label: 'Planteamientos', icon: 'ti-clipboard-text', desc: 'Propuestas de los docentes' },
    { value: 'PROYECTOS', label: 'Proyectos', icon: 'ti-briefcase', desc: 'Intervenciones en ejecución o terminadas' },
  ];

  tipo: TipoReporte = 'PROYECTOS';
  catalogo: Partial<Record<TipoReporte, CatalogoReporte>> = {};
  seleccion: Record<TipoReporte, string[]> = { SOLICITUDES: [], PLANTEAMIENTOS: [], PROYECTOS: [] };

  // Filtros
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  estado: string | null = null;
  carreraId: number | null = null;
  facultadId: number | null = null;
  tipoIntervencion: string | null = null;
  ciudad: string | null = null;
  docente = '';
  orden: 'recientes' | 'antiguas' = 'recientes';

  // Opciones de los menús
  carreraOptions: Opcion<number>[] = [];
  facultadOptions: Opcion<number>[] = [];
  readonly tipoIntervencionOptions = TIPOS_INTERVENCION;
  readonly comunaOptions = COMUNAS_MAULE;
  readonly ordenOptions: Opcion<'recientes' | 'antiguas'>[] = [
    { label: 'Más recientes primero', value: 'recientes' },
    { label: 'Más antiguos primero', value: 'antiguas' },
  ];

  // Vista previa
  vista: ReporteVistaPrevia | null = null;
  loadingVista = false;
  generating = false;
  private reqId = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private reportesService: ReportesService,
    private carrerasService: CarrerasService,
    private facultadesService: FacultadesService,
    private authService: AuthService,
    private messageService: MessageService,
    private router: Router,
  ) {}

  get rol(): string {
    return this.authService.getCurrentUser()?.rol ?? '';
  }

  get canVerReportes(): boolean {
    return ['ADMIN', 'GESTOR_VCM', 'ENCARGADO_CARRERA', 'DECANO'].includes(this.rol);
  }

  /** El Encargado de carrera solo ve su carrera: no necesita filtrar por carrera ni facultad. */
  get esEncargado(): boolean {
    return this.rol === 'ENCARGADO_CARRERA';
  }

  get catalogoActual(): CatalogoReporte | undefined {
    return this.catalogo[this.tipo];
  }

  get estadoOptions(): Opcion<string>[] {
    return (this.catalogoActual?.estados ?? []).map((e) => ({ value: e, label: this.estadoLabel(e) }));
  }

  get etiquetaFecha(): string {
    return this.catalogoActual?.etiquetaFecha ?? 'fecha';
  }

  get hayFiltros(): boolean {
    return !!(
      this.fechaDesde || this.fechaHasta || this.estado || this.carreraId || this.facultadId ||
      this.tipoIntervencion || this.ciudad || this.docente.trim()
    );
  }

  ngOnInit(): void {
    // Defensa en profundidad: Docente/Cliente no acceden aunque peguen la URL.
    if (!this.canVerReportes) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.reportesService.getCatalogoReportes().subscribe({
      next: (cat) => {
        for (const c of cat) {
          this.catalogo[c.tipo] = c;
          this.seleccion[c.tipo] = c.columnas.filter((x) => x.defecto).map((x) => x.key);
        }
        this.cdr.detectChanges();
        this.cargarVista();
      },
      error: () => this.showError('No se pudo cargar la configuración de reportes'),
    });
    if (!this.esEncargado) {
      this.carrerasService.getCarreras({ limit: 100 }).subscribe({
        next: (res) => {
          this.carreraOptions = res.items.map((c) => ({ label: `${c.etiqueta} — ${c.nombre}`, value: c.id }));
          this.cdr.detectChanges();
        },
        error: () => {},
      });
      this.facultadesService.getFacultades({ limit: 100 }).subscribe({
        next: (res) => {
          this.facultadOptions = res.items.map((f) => ({ label: f.nombre, value: f.id }));
          this.cdr.detectChanges();
        },
        error: () => {},
      });
    }
  }

  // ── Tipo y columnas ────────────────────────────────────────────────────────
  seleccionarTipo(t: TipoReporte): void {
    if (t === this.tipo) return;
    this.tipo = t;
    this.estado = null; // los estados dependen del tipo
    this.vista = null;
    this.cargarVista();
  }

  columnaMarcada(key: string): boolean {
    return this.seleccion[this.tipo].includes(key);
  }

  toggleColumna(key: string): void {
    const actual = this.seleccion[this.tipo];
    if (actual.includes(key)) {
      if (actual.length === 1) return; // siempre debe quedar al menos una
      this.seleccion[this.tipo] = actual.filter((k) => k !== key);
    } else {
      this.seleccion[this.tipo] = [...actual, key];
    }
    this.onCambio();
  }

  todasLasColumnas(): void {
    this.seleccion[this.tipo] = (this.catalogoActual?.columnas ?? []).map((c) => c.key);
    this.onCambio();
  }

  columnasPredeterminadas(): void {
    this.seleccion[this.tipo] = (this.catalogoActual?.columnas ?? []).filter((c) => c.defecto).map((c) => c.key);
    this.onCambio();
  }

  // ── Filtros ────────────────────────────────────────────────────────────────
  onFacultadChange(): void {
    this.onCambio();
  }

  limpiarFiltros(): void {
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.estado = null;
    this.carreraId = null;
    this.facultadId = null;
    this.tipoIntervencion = null;
    this.ciudad = null;
    this.docente = '';
    this.cargarVista();
  }

  /** Recalcula la vista previa poco después del último cambio (evita una consulta por cada tecla). */
  onCambio(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.cargarVista(), 350);
  }

  private toIso(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  private armarFiltros(): ReporteFiltros {
    return {
      tipo: this.tipo,
      fechaDesde: this.fechaDesde ? this.toIso(this.fechaDesde) : null,
      fechaHasta: this.fechaHasta ? this.toIso(this.fechaHasta) : null,
      estado: this.estado,
      carreraId: this.carreraId,
      facultadId: this.facultadId,
      tipoIntervencion: this.tipoIntervencion,
      ciudad: this.ciudad,
      docente: this.docente.trim() || null,
      orden: this.orden,
      columnas: this.seleccion[this.tipo].join(','),
    };
  }

  // ── Vista previa ───────────────────────────────────────────────────────────
  cargarVista(): void {
    if (!this.catalogoActual) return;
    const id = ++this.reqId;
    this.loadingVista = true;
    this.cdr.detectChanges();
    this.reportesService.getVistaPreviaReporte({ ...this.armarFiltros(), limite: 15 }).subscribe({
      next: (v) => {
        if (id !== this.reqId) return; // llegó una respuesta más antigua que otra ya pedida
        this.vista = v;
        this.loadingVista = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (id !== this.reqId) return;
        this.loadingVista = false;
        this.cdr.detectChanges();
        this.showError(err?.error?.message?.toString() || 'No se pudo calcular la vista previa');
      },
    });
  }

  // ── Descarga ───────────────────────────────────────────────────────────────
  generarPdf(): void {
    this.generating = true;
    this.reportesService.descargarReportePdf(this.armarFiltros()).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${this.tipo.toLowerCase()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.generating = false;
        this.messageService.add({ severity: 'success', summary: 'Reporte generado', detail: 'La descarga del PDF ha comenzado', life: 3000 });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.generating = false;
        this.cdr.detectChanges();
        this.showBlobError(err);
      },
    });
  }

  estadoLabel(e: string): string {
    const t = e.replace(/_/g, ' ').toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // Con responseType:'blob' el cuerpo del error también llega como Blob.
  private showBlobError(err: any): void {
    const fallback = 'No se pudo generar el reporte';
    const body = err?.error;
    if (body instanceof Blob) {
      body.text()
        .then((text) => {
          let detail = fallback;
          try {
            const parsed = JSON.parse(text);
            detail = Array.isArray(parsed?.message) ? parsed.message.join(', ') : parsed?.message ?? (text || fallback);
          } catch {
            detail = text || fallback;
          }
          this.showError(detail);
        })
        .catch(() => this.showError(fallback));
      return;
    }
    this.showError(body?.message || fallback);
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
