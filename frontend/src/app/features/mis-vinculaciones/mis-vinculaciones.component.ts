import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ChartModule } from 'primeng/chart';
import { PlanteamientosService } from '../../core/services/planteamientos.service';
import { AuthService } from '../../core/services/auth.service';
import { GrupoVinculacion, Vinculacion } from '../../core/models/mis-vinculaciones.model';
import { TIPOS_INTERVENCION, tipoIntervencionLabel } from '../../core/constants/tipos-intervencion';

const AZUL = '#1B3D8C';
const CELESTE = '#29ABE2';

@Component({
  selector: 'app-mis-vinculaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, SelectModule, TagModule, ChartModule],
  templateUrl: './mis-vinculaciones.component.html',
  styleUrl: './mis-vinculaciones.component.scss',
})
export class MisVinculacionesComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private service: PlanteamientosService,
    private authService: AuthService,
    private router: Router,
  ) {}

  items: Vinculacion[] = [];
  loading = false;
  error = false;

  fAnio: number | null = null;
  fGrupo: GrupoVinculacion | null = null;
  fTipo: string | null = null;

  anioOptions: { label: string; value: number }[] = [];
  readonly tipoOptions = TIPOS_INTERVENCION;
  readonly grupoOptions: { label: string; value: GrupoVinculacion }[] = [
    { label: 'En trámite', value: 'TRAMITE' },
    { label: 'En curso', value: 'CURSO' },
    { label: 'Finalizadas', value: 'FINALIZADA' },
    { label: 'Canceladas', value: 'CANCELADA' },
    { label: 'Rechazadas', value: 'RECHAZADA' },
  ];
  getTipoLabel = tipoIntervencionLabel;

  // Resultado de aplicar los filtros
  filtrados: Vinculacion[] = [];
  kpi = { total: 0, finalizadas: 0, enCurso: 0, enTramite: 0, participantes: 0, horas: 0 };
  chartAnio: any;
  chartTipo: any;

  readonly optsBarra = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { precision: 0 }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };
  readonly optsBarraH = {
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 } },
      y: { grid: { display: false } },
    },
  };

  get hayFiltros(): boolean {
    return this.fAnio !== null || this.fGrupo !== null || this.fTipo !== null;
  }

  ngOnInit(): void {
    if (this.authService.getCurrentUser()?.rol === 'CLIENTE') {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = false;
    this.service.getMisVinculaciones().subscribe({
      next: (items) => {
        this.items = items;
        const anios = [...new Set(items.map(i => i.anio))].sort((a, b) => b - a);
        this.anioOptions = anios.map(a => ({ label: String(a), value: a }));
        this.recalcular();
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

  limpiar(): void {
    this.fAnio = null;
    this.fGrupo = null;
    this.fTipo = null;
    this.recalcular();
  }

  /** Aplica los filtros y recalcula totales y gráficos con lo que queda. */
  recalcular(): void {
    this.filtrados = this.items.filter(i =>
      (this.fAnio === null || i.anio === this.fAnio) &&
      (this.fGrupo === null || i.grupo === this.fGrupo) &&
      (this.fTipo === null || i.tipoIntervencion === this.fTipo),
    );
    const f = this.filtrados;
    this.kpi = {
      total: f.length,
      finalizadas: f.filter(i => i.grupo === 'FINALIZADA').length,
      enCurso: f.filter(i => i.grupo === 'CURSO').length,
      enTramite: f.filter(i => i.grupo === 'TRAMITE').length,
      participantes: f.reduce((s, i) => s + i.participantes, 0),
      horas: f.reduce((s, i) => s + i.horasHombre, 0),
    };

    // Por año
    const porAnio = new Map<number, number>();
    f.forEach(i => porAnio.set(i.anio, (porAnio.get(i.anio) ?? 0) + 1));
    const anios = [...porAnio.keys()].sort((a, b) => a - b);
    this.chartAnio = {
      labels: anios.map(String),
      datasets: [{ label: 'Vinculaciones', data: anios.map(a => porAnio.get(a)), backgroundColor: AZUL }],
    };

    // Por tipo de intervención
    const porTipo = new Map<string, number>();
    f.forEach(i => {
      const label = tipoIntervencionLabel(i.tipoIntervencion, null);
      porTipo.set(label, (porTipo.get(label) ?? 0) + 1);
    });
    const tipos = [...porTipo.entries()].sort((a, b) => b[1] - a[1]);
    this.chartTipo = {
      labels: tipos.map(t => t[0]),
      datasets: [{ label: 'Vinculaciones', data: tipos.map(t => t[1]), backgroundColor: CELESTE }],
    };
  }

  getGrupoStyle(g: GrupoVinculacion): Record<string, string> {
    const map: Record<GrupoVinculacion, string> = {
      TRAMITE: '#F59E0B',
      CURSO: '#29ABE2',
      FINALIZADA: '#22C55E',
      CANCELADA: '#6B7280',
      RECHAZADA: '#EF4444',
    };
    return { background: map[g], color: '#fff' };
  }
}
