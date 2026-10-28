import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { AuthService } from '../../core/services/auth.service';
import { ReportesService } from '../../core/services/reportes.service';
import { SolicitudesService } from '../../core/services/solicitudes.service';
import { MiResumen } from '../../core/models/mi-resumen.model';
import { CarrerasService } from '../../core/services/carreras.service';
import { FacultadesService } from '../../core/services/facultades.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { User } from '../../core/models/user.model';
import { Dashboard } from '../../core/models/dashboard.model';
import { TIPOS_INTERVENCION } from '../../core/constants/tipos-intervencion';

const AZUL = '#1B3D8C';
const CELESTE = '#29ABE2';
const TEAL = '#4DB6AC';
const VERDE = '#22C55E';
const AMARILLO = '#F59E0B';
const ROJO = '#EF4444';
const GRIS = '#9CA3AF';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePickerModule, SelectModule, ButtonModule, ChartModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private authService: AuthService,
    private reportes: ReportesService,
    private carrerasService: CarrerasService,
    private solicitudesService: SolicitudesService,
    private facultadesService: FacultadesService,
    private usuariosService: UsuariosService,
  ) {}

  get currentUser(): User | null {
    return this.authService.getCurrentUser();
  }

  /** El panel de indicadores es para Decano, Director de VCM y Admin; el resto ve la bienvenida. */
  get showPanel(): boolean {
    const rol = this.currentUser?.rol;
    return rol === 'DECANO' || rol === 'DIRECTOR_VCM' || rol === 'ADMIN';
  }

  /** Director y Admin ven todas las facultades (con comparación); el Decano solo la suya. */
  get esGlobal(): boolean {
    const rol = this.currentUser?.rol;
    return rol === 'DIRECTOR_VCM' || rol === 'ADMIN';
  }

  /** Nombre de la facultad del Decano, para mostrarlo en el encabezado. */
  facultadDecano: string | null = null;

  // ── Inicio del solicitante ─────────────────────────────────────────────────
  get esCliente(): boolean {
    return this.currentUser?.rol === 'CLIENTE';
  }

  resumen: MiResumen | null = null;
  resumenCargando = false;
  resumenError = false;

  /** Alertas que el solicitante ya cerró (se recuerdan en su navegador). */
  private alertasCerradas = new Set<number>();

  private get claveAlertas(): string {
    return `vcm_alertas_cerradas_${this.currentUser?.id ?? 0}`;
  }

  private leerAlertasCerradas(): void {
    try {
      const raw = localStorage.getItem(this.claveAlertas);
      this.alertasCerradas = new Set<number>(raw ? JSON.parse(raw) : []);
    } catch {
      this.alertasCerradas = new Set<number>();
    }
  }

  cerrarAlerta(id: number): void {
    this.alertasCerradas.add(id);
    try {
      localStorage.setItem(this.claveAlertas, JSON.stringify([...this.alertasCerradas]));
    } catch {
      // sin almacenamiento disponible: la alerta se oculta solo mientras la página esté abierta
    }
  }

  /** Solicitudes rechazadas más recientes (con su motivo) que el solicitante aún no cerró. */
  get rechazadasRecientes() {
    return (this.resumen?.solicitudes ?? [])
      .filter(s => s.estado === 'RECHAZADA' && !this.alertasCerradas.has(s.id))
      .slice(0, 3);
  }

  cargarResumen(): void {
    this.resumenCargando = true;
    this.resumenError = false;
    this.solicitudesService.getMiResumen().subscribe({
      next: (r) => {
        this.resumen = r;
        this.resumenCargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.resumenCargando = false;
        this.resumenError = true;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Filtros ────────────────────────────────────────────────────────────────
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  facultadId: number | null = null;
  carreraId: number | null = null;
  tipoIntervencion: string | null = null;
  facultadOptions: { label: string; value: number }[] = [];
  private todasCarreras: { label: string; value: number; facultadId: number }[] = [];
  readonly tipoOptions = TIPOS_INTERVENCION;

  // ── Datos ──────────────────────────────────────────────────────────────────
  data: Dashboard | null = null;
  loading = false;
  error = false;

  chartMes: any;
  chartSolEstado: any;
  chartProyEstado: any;
  chartTipo: any;
  chartCarrera: any;
  chartFacultad: any;
  chartComuna: any;
  chartEmbudo: any;
  chartTiempos: any;
  chartRechazo: any;
  chartHitos: any;

  readonly optsLinea = this.baseOptions(true);
  readonly optsDonut = {
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const, labels: { usePointStyle: true } } },
  };
  readonly optsBarra = this.baseOptions(true);
  readonly optsBarraH = { ...this.baseOptions(false), indexAxis: 'y' as const };

  ngOnInit(): void {
    if (this.esCliente) {
      this.leerAlertasCerradas();
      this.cargarResumen();
      return;
    }
    if (!this.showPanel) return;
    this.carrerasService.getCarreras({ limit: 100 }).subscribe({
      next: (res) => {
        this.todasCarreras = res.items.map((c) => ({ label: c.nombre, value: c.id, facultadId: c.facultadId }));
        this.cdr.detectChanges();
      },
    });
    if (this.esGlobal) {
      this.facultadesService.getFacultades({ limit: 100 }).subscribe({
        next: (res) => {
          this.facultadOptions = res.items.map((f) => ({ label: f.nombre, value: f.id }));
          this.cdr.detectChanges();
        },
      });
    } else if (this.currentUser?.rol === 'DECANO') {
      this.usuariosService.getMiPerfil().subscribe({
        next: (u) => {
          this.facultadDecano = u.facultad?.nombre ?? null;
          this.cdr.detectChanges();
        },
        error: () => {},
      });
    }
    this.cargar();
  }

  private baseOptions(legend: boolean) {
    return {
      maintainAspectRatio: false,
      plugins: { legend: { display: legend, position: 'bottom' as const, labels: { usePointStyle: true } } },
      scales: {
        x: { ticks: { precision: 0 }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    };
  }

  private toIso(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  /** Carreras que se ofrecen en el filtro: las de la facultad elegida (o todas las visibles). */
  get carreraOptions(): { label: string; value: number }[] {
    return this.todasCarreras.filter((c) => this.facultadId === null || c.facultadId === this.facultadId);
  }

  /** Al cambiar de facultad se limpia la carrera para no dejar una combinación imposible. */
  onFacultadChange(): void {
    this.carreraId = null;
    this.cargar();
  }

  /** Desde la tabla comparativa: baja de lo general a una facultad (o vuelve a todas al repetir el clic). */
  seleccionarFacultad(id: number): void {
    if (!this.esGlobal) return;
    this.facultadId = this.facultadId === id ? null : id;
    this.carreraId = null;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.facultadId = null;
    this.carreraId = null;
    this.tipoIntervencion = null;
    this.cargar();
  }

  get hayFiltros(): boolean {
    return !!(this.fechaDesde || this.fechaHasta || this.facultadId || this.carreraId || this.tipoIntervencion);
  }

  cargar(): void {
    this.loading = true;
    this.error = false;
    this.reportes
      .getDashboard({
        fechaDesde: this.fechaDesde ? this.toIso(this.fechaDesde) : null,
        fechaHasta: this.fechaHasta ? this.toIso(this.fechaHasta) : null,
        facultadId: this.esGlobal ? this.facultadId : null,
        carreraId: this.carreraId,
        tipoIntervencion: this.tipoIntervencion,
      })
      .subscribe({
        next: (d) => {
          this.data = d;
          this.armarGraficos(d);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.error = true;
          this.cdr.detectChanges();
        },
      });
  }

  private tipoLabel(tipo: string): string {
    if (tipo === 'SIN_TIPO') return 'Sin tipo definido';
    return TIPOS_INTERVENCION.find((t) => t.value === tipo)?.label ?? tipo;
  }

  private mesLabel(key: string): string {
    const [y, m] = key.split('-');
    return `${MESES[Number(m) - 1]} ${y}`;
  }

  private armarGraficos(d: Dashboard): void {
    const r = d.resumen;

    this.chartFacultad = {
      labels: (d.porFacultad ?? []).map((f) => f.etiqueta),
      datasets: [
        { label: 'Solicitudes', data: (d.porFacultad ?? []).map((f) => f.solicitudes), backgroundColor: CELESTE },
        { label: 'Proyectos', data: (d.porFacultad ?? []).map((f) => f.proyectos), backgroundColor: AZUL },
        { label: 'Proyectos finalizados', data: (d.porFacultad ?? []).map((f) => f.finalizados), backgroundColor: VERDE },
      ],
    };

    this.chartMes = {
      labels: d.porMes.map((m) => this.mesLabel(m.mes)),
      datasets: [
        { label: 'Solicitudes recibidas', data: d.porMes.map((m) => m.solicitudes), borderColor: AZUL, backgroundColor: AZUL, tension: 0.3 },
        { label: 'Proyectos iniciados', data: d.porMes.map((m) => m.proyectos), borderColor: TEAL, backgroundColor: TEAL, tension: 0.3 },
      ],
    };

    this.chartSolEstado = {
      labels: ['Pendientes', 'Aprobadas', 'Rechazadas'],
      datasets: [{ data: [r.solicitudes.pendientes, r.solicitudes.aprobadas, r.solicitudes.rechazadas], backgroundColor: [AMARILLO, VERDE, ROJO] }],
    };

    this.chartProyEstado = {
      labels: ['En proceso', 'Pausados', 'Finalizados', 'Cancelados'],
      datasets: [{ data: [r.proyectos.enProceso, r.proyectos.pausados, r.proyectos.finalizados, r.proyectos.cancelados], backgroundColor: [CELESTE, AMARILLO, VERDE, GRIS] }],
    };

    this.chartTipo = {
      labels: d.porTipoIntervencion.map((t) => this.tipoLabel(t.tipo)),
      datasets: [
        { label: 'Planteamientos', data: d.porTipoIntervencion.map((t) => t.planteamientos), backgroundColor: CELESTE },
        { label: 'Proyectos', data: d.porTipoIntervencion.map((t) => t.proyectos), backgroundColor: AZUL },
      ],
    };

    this.chartCarrera = {
      labels: d.porCarrera.map((c) => c.etiqueta),
      datasets: [
        { label: 'Solicitudes', data: d.porCarrera.map((c) => c.solicitudes), backgroundColor: CELESTE },
        { label: 'Proyectos', data: d.porCarrera.map((c) => c.proyectos), backgroundColor: AZUL },
      ],
    };

    this.chartComuna = {
      labels: d.porComuna.map((c) => c.comuna),
      datasets: [{ label: 'Solicitudes', data: d.porComuna.map((c) => c.solicitudes), backgroundColor: TEAL }],
    };

    this.armarSeguimiento(d);
  }

  /** Indicadores del seguimiento de cada fase (embudo, tiempos, rechazos e hitos por mes). */
  private armarSeguimiento(d: Dashboard): void {
    const s = d.seguimiento;
    if (!s) return;

    this.chartEmbudo = {
      labels: s.embudo.map((p) => p.label),
      datasets: [{
        label: 'Iniciativas',
        data: s.embudo.map((p) => p.cuenta),
        backgroundColor: [CELESTE, TEAL, AMARILLO, VERDE, AZUL, '#0F766E'],
      }],
    };

    this.chartTiempos = {
      labels: s.tiempos.map((t) => `${t.label} (${t.casos} casos)`),
      datasets: [{
        label: 'Días promedio',
        data: s.tiempos.map((t) => t.promedioDias ?? 0),
        backgroundColor: [CELESTE, TEAL, AMARILLO, VERDE, AZUL, GRIS],
      }],
    };

    this.chartRechazo = {
      labels: ['Solicitudes', 'Planteamientos'],
      datasets: [{
        label: '% de rechazo',
        data: [s.rechazos.solicitud.pctRechazo, s.rechazos.planteamiento.pctRechazo],
        backgroundColor: [ROJO, AMARILLO],
      }],
    };

    this.chartHitos = {
      labels: s.hitosPorMes.map((m) => this.mesLabel(m.mes)),
      datasets: [
        { label: 'Solicitudes recibidas', data: s.hitosPorMes.map((m) => m.solicitudes), borderColor: CELESTE, backgroundColor: CELESTE, tension: 0.3 },
        { label: 'Solicitudes aprobadas', data: s.hitosPorMes.map((m) => m.solicitudesAprobadas), borderColor: TEAL, backgroundColor: TEAL, tension: 0.3 },
        { label: 'Planteamientos aprobados', data: s.hitosPorMes.map((m) => m.planteamientosAprobados), borderColor: AMARILLO, backgroundColor: AMARILLO, tension: 0.3 },
        { label: 'Proyectos creados', data: s.hitosPorMes.map((m) => m.proyectosCreados), borderColor: AZUL, backgroundColor: AZUL, tension: 0.3 },
        { label: 'Proyectos finalizados', data: s.hitosPorMes.map((m) => m.proyectosFinalizados), borderColor: VERDE, backgroundColor: VERDE, tension: 0.3 },
      ],
    };
  }

  fmt(n: number | null | undefined, sufijo = ''): string {
    return n === null || n === undefined ? '—' : `${n.toLocaleString('es-CL')}${sufijo}`;
  }
}
