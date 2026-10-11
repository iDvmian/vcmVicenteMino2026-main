import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ReportesService } from '../../core/services/reportes.service';
import { CarrerasService } from '../../core/services/carreras.service';
import { AuthService } from '../../core/services/auth.service';
import { EstadoProyecto } from '../../core/models/proyecto.model';

interface CarreraOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, ToastModule],
  providers: [MessageService],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss',
})
export class ReportesComponent implements OnInit {
  selectedEstado: EstadoProyecto | null = null;
  selectedCarreraId: number | null = null;
  generating = false;

  readonly estadoOptions: { label: string; value: EstadoProyecto }[] = [
    { label: 'En proceso', value: 'EN_PROCESO' },
    { label: 'Pausado', value: 'PAUSADO' },
    { label: 'Finalizado', value: 'FINALIZADO' },
    { label: 'Cancelado', value: 'CANCELADO' },
  ];

  carrerasOptions: CarreraOption[] = [];

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private reportesService: ReportesService,
    private carrerasService: CarrerasService,
    private authService: AuthService,
    private messageService: MessageService,
    private router: Router,
  ) {}

  get canVerReportes(): boolean {
    return ['ADMIN', 'GESTOR_VCM', 'ENCARGADO_CARRERA', 'DECANO']
      .includes(this.authService.getCurrentUser()?.rol ?? '');
  }

  ngOnInit(): void {
    // Defensa en profundidad: DOCENTE/CLIENTE no acceden aunque peguen la URL.
    if (!this.canVerReportes) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.loadCarreras();
  }

  loadCarreras(): void {
    this.carrerasService.getCarreras({ limit: 100 }).subscribe({
      next: (res) => {
        this.carrerasOptions = res.items.map(c => ({
          label: `${c.etiqueta} — ${c.nombre}`,
          value: c.id,
        }));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  generarPdf(): void {
    this.generating = true;
    this.reportesService
      .descargarReporteProyectos({ estado: this.selectedEstado, carreraId: this.selectedCarreraId })
      .subscribe({
        next: (blob) => {
          this.triggerDownload(blob);
          this.generating = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Reporte generado',
            detail: 'La descarga del PDF ha comenzado',
            life: 3000,
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.generating = false;
          this.cdr.detectChanges();
          this.showBackendError(err);
        },
      });
  }

  clearFilters(): void {
    this.selectedEstado = null;
    this.selectedCarreraId = null;
  }

  private triggerDownload(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte-proyectos.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Con responseType:'blob' el cuerpo del error también llega como Blob.
  // Intentamos leerlo como texto/JSON para mostrar el mensaje real del backend;
  // si no se puede, mostramos un mensaje genérico.
  private showBackendError(err: any): void {
    const fallback = 'No se pudo generar el reporte';
    const body = err?.error;
    if (body instanceof Blob) {
      body.text()
        .then((text) => {
          let detail = fallback;
          try {
            const parsed = JSON.parse(text);
            detail = Array.isArray(parsed?.message)
              ? parsed.message.join(', ')
              : parsed?.message ?? (text || fallback);
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
    this.cdr.detectChanges();
  }
}
