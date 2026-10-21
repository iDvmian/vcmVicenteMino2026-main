import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { AuthService } from '../../core/services/auth.service';
import { ReportesService } from '../../core/services/reportes.service';
import { CarrerasService } from '../../core/services/carreras.service';
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
  imports: [CommonModule, FormsModule, DatePickerModule, SelectModule, ButtonModule, ChartModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private authService: AuthService,
    private reportes: ReportesService,
    private carrerasService: CarrerasService,
  ) {}

  get currentUser(): User | null {
    return this.authService.getCurrentUser();
  }

  /** El panel de indicadores es solo para Decano y Admin; el resto ve la bienvenida. */
  get showPanel(): boolean {
    const rol = this.currentUser?.rol;
    return rol === 'DECANO' || rol === 'ADMIN';
  }

  // ── Filtros ────────────────────────────────────────────────────────────────
  rangoFechas: Date[] | null = null;
  carreraId: number | null = null;
  tipoIntervencion: string | null = null;
  carreraOptions: { label: string; value: number }[] = [];
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
  chartComuna: any;

  readonly optsLinea = this.baseOptions(true);
  readonly optsDonut = {
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const, labels: { usePointStyle: true } } },
  };
  readonly optsBarra = this.baseOptions(true);
  readonly optsBarraH = { ...this.baseOptions(false), indexAxis: 'y' as const };

  ngOnInit(): void {
    if (!this.showPanel) return;
    this.carrerasService.getCarreras({ limit: 100 }).subscribe({
      next: (res) => {
        this.carreraOptions = res.items.map((c) => ({ label: c.nombre, value: c.id }));
        this.cdr.detectChanges();
      },
    });
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

  onRangoSelect(): void {
    const [ini, fin] = this.rangoFechas ?? [];
    if (ini && fin) this.cargar();
  }

  onRangoClear(): void {
    this.rangoFechas = null;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.rangoFechas = null;
    this.carreraId = null;
    this.tipoIntervencion = null;
    this.cargar();
  }

  get hayFiltros(): boolean {
    return !!(this.rangoFechas?.length || this.carreraId || this.tipoIntervencion);
  }

  cargar(): void {
    const [ini, fin] = this.rangoFechas ?? [];
    this.loading = true;
    this.error = false;
    this.reportes
      .getDashboard({
        fechaDesde: ini ? this.toIso(ini) : null,
        fechaHasta: fin ? this.toIso(fin) : ini ? this.toIso(ini) : null,
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
  }

  fmt(n: number | null | undefined, sufijo = ''): string {
    return n === null || n === undefined ? '—' : `${n.toLocaleString('es-CL')}${sufijo}`;
  }
}
