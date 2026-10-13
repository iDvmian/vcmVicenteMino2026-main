import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PlanteamientosService, CreatePlanteamientoDto, UpdatePlanteamientoDto, GestionarPlanteamientoDto } from '../../core/services/planteamientos.service';
import { SolicitudesService } from '../../core/services/solicitudes.service';
import { AuthService } from '../../core/services/auth.service';
import { Planteamiento, EstadoPlanteamiento } from '../../core/models/planteamiento.model';
import { TIPOS_INTERVENCION, UNIDADES_DURACION, tipoIntervencionLabel, TipoIntervencion } from '../../core/constants/tipos-intervencion';

interface SolicitudOption {
  id: number;
  label: string;
}

@Component({
  selector: 'app-planteamientos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './planteamientos.component.html',
  styleUrl: './planteamientos.component.scss',
})
export class PlanteamientosComponent implements OnInit {
  items: Planteamiento[] = [];
  totalRecords = 0;
  loading = false;
  readonly rows = 10;
  currentPage = 1;

  selectedEstado: EstadoPlanteamiento | null = null;
  solicitudesDropdown: SolicitudOption[] = [];

  readonly estadoOptions: { label: string; value: EstadoPlanteamiento }[] = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Aprobado', value: 'APROBADO' },
    { label: 'Rechazado', value: 'RECHAZADO' },
  ];

  readonly gestionarEstadoOptions: { label: string; value: 'APROBADO' | 'RECHAZADO' }[] = [
    { label: 'Aprobado', value: 'APROBADO' },
    { label: 'Rechazado', value: 'RECHAZADO' },
  ];

  // Modal crear / editar
  dialogVisible = false;
  editingItem: Planteamiento | null = null;
  viewOnly = false;
  saving = false;
  form: FormGroup;

  // Archivos
  uploadingFile = false;

  // Modal gestionar
  gestionarDialogVisible = false;
  gestionarItem: Planteamiento | null = null;
  gestionarSaving = false;
  gestionarForm: FormGroup;

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private service: PlanteamientosService,
    private solicitudesService: SolicitudesService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      solicitudId: [null, Validators.required],
      descripcion: ['', Validators.required],
      duracionCantidad: [null, [Validators.required, Validators.min(1), Validators.max(999)]],
      duracionUnidad: ['MESES', Validators.required],
      horasHombre: [null, [Validators.required, Validators.min(1), Validators.max(100000)]],
      tipoIntervencion: [null, Validators.required],
      tipoIntervencionOtro: ['', Validators.maxLength(100)],
    });

    // "Otro" exige describir el tipo; con cualquier otro tipo el campo se limpia
    this.form.get('tipoIntervencion')?.valueChanges.subscribe((tipo: TipoIntervencion | null) => {
      const otro = this.form.get('tipoIntervencionOtro');
      if (tipo === 'OTRO') {
        otro?.setValidators([Validators.required, Validators.maxLength(100)]);
      } else {
        otro?.setValidators([Validators.maxLength(100)]);
        otro?.setValue('', { emitEvent: false });
      }
      otro?.updateValueAndValidity({ emitEvent: false });
    });

    this.gestionarForm = this.fb.group({
      estado: [null, Validators.required],
    });
  }

  readonly tiposIntervencion = TIPOS_INTERVENCION;
  readonly unidadesDuracion = UNIDADES_DURACION;
  getTipoLabel = tipoIntervencionLabel;

  get esOtroTipo(): boolean { return this.form.get('tipoIntervencion')?.value === 'OTRO'; }

  get currentUser() { return this.authService.getCurrentUser(); }

  // ADMIN puede editar/eliminar cualquier planteamiento PENDIENTE
  get isAdmin() { return this.currentUser?.rol === 'ADMIN'; }

  get canCreate() { return ['DOCENTE', 'ADMIN'].includes(this.currentUser?.rol ?? ''); }

  get canGestionar() { return ['ENCARGADO_CARRERA', 'ADMIN'].includes(this.currentUser?.rol ?? ''); }

  get useAllEndpoint() {
    return ['ADMIN', 'GESTOR_VCM', 'ENCARGADO_CARRERA', 'DECANO'].includes(this.currentUser?.rol ?? '');
  }

  get showDocenteColumn() { return this.currentUser?.rol !== 'DOCENTE'; }

  canEdit(p: Planteamiento): boolean {
    return p.estado === 'PENDIENTE' && (p.docenteId === this.currentUser?.id || this.isAdmin);
  }

  canDelete(p: Planteamiento): boolean {
    return this.canEdit(p);
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user?.rol === 'CLIENTE') {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.loadSolicitudesDropdown();
    this.loadItems();
  }

  loadSolicitudesDropdown(): void {
    const rol = this.currentUser?.rol ?? '';
    // CLIENTE no puede crear planteamientos; el resto usa getAll() —
    // el backend aplica filtro por carreraId automáticamente para DOCENTE y ENCARGADO_CARRERA
    if (!rol || rol === 'CLIENTE') return;

    this.solicitudesService.getAll({ estado: 'APROBADA', limit: 100 }).subscribe({
      next: (res) => {
        this.solicitudesDropdown = res.items.map(s => ({ id: s.id, label: s.titulo }));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  loadItems(): void {
    this.loading = true;
    const params: Record<string, any> = { page: this.currentPage, limit: this.rows };
    if (this.selectedEstado !== null) params['estado'] = this.selectedEstado;

    const obs = this.useAllEndpoint
      ? this.service.getAll(params)
      : this.service.getMisPlanteamientos(params);

    obs.subscribe({
      next: (res) => {
        this.items = res.items;
        this.totalRecords = res.total;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.showError('Error al cargar los planteamientos');
      },
    });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.currentPage = (event.first ?? 0) / (event.rows ?? this.rows) + 1;
    this.loadItems();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadItems();
  }

  clearFilters(): void {
    this.selectedEstado = null;
    this.currentPage = 1;
    this.loadItems();
  }

  openCreate(): void {
    this.editingItem = null;
    this.viewOnly = false;
    this.form.reset();
    this.form.enable();
    this.dialogVisible = true;
  }

  openEdit(item: Planteamiento, readonly = false): void {
    this.editingItem = item;
    this.viewOnly = readonly;
    this.form.patchValue({
      solicitudId: item.solicitudId,
      descripcion: item.descripcion,
      duracionCantidad: item.duracionCantidad ?? null,
      duracionUnidad: item.duracionUnidad ?? 'MESES',
      horasHombre: item.horasHombre ?? null,
      tipoIntervencion: item.tipoIntervencion ?? null,
      tipoIntervencionOtro: item.tipoIntervencionOtro ?? '',
    });
    // solicitudId siempre readonly al editar — no se puede reasignar
    this.form.get('solicitudId')?.disable();
    if (readonly) {
      this.form.disable();
    } else {
      this.form.get('descripcion')?.enable();
      this.form.get('duracionCantidad')?.enable();
      this.form.get('duracionUnidad')?.enable();
      this.form.get('horasHombre')?.enable();
      this.form.get('tipoIntervencion')?.enable();
      this.form.get('tipoIntervencionOtro')?.enable();
    }
    this.dialogVisible = true;
  }

  save(): void {
    if (this.viewOnly) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const raw = this.form.getRawValue();

    if (this.editingItem) {
      const dto: UpdatePlanteamientoDto = {
        descripcion: raw.descripcion,
        duracionCantidad: Number(raw.duracionCantidad),
        duracionUnidad: raw.duracionUnidad,
        horasHombre: Number(raw.horasHombre),
        tipoIntervencion: raw.tipoIntervencion,
        tipoIntervencionOtro: raw.tipoIntervencion === 'OTRO' ? raw.tipoIntervencionOtro?.trim() : undefined,
      };
      this.service.update(this.editingItem.id, dto).subscribe({
        next: () => this.onSaveSuccess('Planteamiento actualizado'),
        error: (err: any) => this.onSaveError(err),
      });
    } else {
      const dto: CreatePlanteamientoDto = {
        solicitudId: raw.solicitudId,
        descripcion: raw.descripcion,
        duracionCantidad: Number(raw.duracionCantidad),
        duracionUnidad: raw.duracionUnidad,
        horasHombre: Number(raw.horasHombre),
        tipoIntervencion: raw.tipoIntervencion,
        tipoIntervencionOtro: raw.tipoIntervencion === 'OTRO' ? raw.tipoIntervencionOtro?.trim() : undefined,
      };
      this.service.create(dto).subscribe({
        next: () => this.onSaveSuccess('Planteamiento creado'),
        error: (err: any) => this.onSaveError(err),
      });
    }
  }

  private onSaveSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail, life: 3000 });
    this.dialogVisible = false;
    this.currentPage = 1;
    this.saving = false;
    this.cdr.detectChanges();
    this.loadItems();
  }

  private onSaveError(err: any): void {
    this.saving = false;
    this.cdr.detectChanges();
    this.showError(err?.error?.message || 'Error al guardar el planteamiento');
  }

  confirmDelete(item: Planteamiento): void {
    this.confirmationService.confirm({
      message: `¿Eliminar este planteamiento? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.deleteItem(item),
    });
  }

  private deleteItem(item: Planteamiento): void {
    this.service.delete(item.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Planteamiento eliminado correctamente', life: 3000 });
        this.currentPage = 1;
        this.cdr.detectChanges();
        this.loadItems();
      },
      error: (err: any) => {
        this.cdr.detectChanges();
        this.showError(err?.error?.message || 'No se pudo eliminar el planteamiento');
      },
    });
  }

  // ── Archivos ─────────────────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.editingItem) return;
    const file = input.files[0];
    input.value = '';
    this.uploadingFile = true;
    this.cdr.detectChanges();

    this.service.addArchivo(this.editingItem.id, file).subscribe({
      next: () => {
        this.uploadingFile = false;
        this.messageService.add({ severity: 'success', summary: 'Archivo subido', detail: `"${file.name}" agregado correctamente`, life: 3000 });
        this.refreshEditingItem();
      },
      error: (err: any) => {
        this.uploadingFile = false;
        this.cdr.detectChanges();
        this.showError(err?.error?.message || 'Error al subir el archivo');
      },
    });
  }

  confirmRemoveArchivo(archivoId: number, nombre: string): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el archivo "${nombre}"?`,
      header: 'Confirmar',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.removeArchivo(archivoId),
    });
  }

  private removeArchivo(archivoId: number): void {
    if (!this.editingItem) return;
    this.service.removeArchivo(this.editingItem.id, archivoId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Archivo eliminado', detail: 'Archivo eliminado correctamente', life: 3000 });
        this.refreshEditingItem();
      },
      error: (err: any) => {
        this.cdr.detectChanges();
        this.showError(err?.error?.message || 'Error al eliminar el archivo');
      },
    });
  }

  private refreshEditingItem(): void {
    if (!this.editingItem) return;
    this.service.getById(this.editingItem.id).subscribe({
      next: (updated) => {
        this.editingItem = updated;
        this.cdr.detectChanges();
      },
      error: () => { this.cdr.detectChanges(); },
    });
  }

  // ── Gestionar ─────────────────────────────────────────────
  openGestionar(item: Planteamiento): void {
    this.gestionarItem = item;
    this.gestionarForm.reset();
    this.gestionarDialogVisible = true;
  }

  saveGestionar(): void {
    if (this.gestionarForm.invalid) {
      this.gestionarForm.markAllAsTouched();
      return;
    }
    this.gestionarSaving = true;
    const dto: GestionarPlanteamientoDto = {
      estado: this.gestionarForm.value.estado,
    };
    this.service.gestionar(this.gestionarItem!.id, dto).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Planteamiento gestionado correctamente', life: 3000 });
        this.gestionarDialogVisible = false;
        this.gestionarSaving = false;
        this.cdr.detectChanges();
        this.currentPage = 1;
        this.loadItems();
      },
      error: (err: any) => {
        this.gestionarSaving = false;
        this.cdr.detectChanges();
        this.showError(err?.error?.message || 'Error al gestionar el planteamiento');
      },
    });
  }

  getEstadoStyle(estado: EstadoPlanteamiento): Record<string, string> {
    const colors: Record<EstadoPlanteamiento, string> = {
      PENDIENTE: 'var(--ucm-warning)',
      APROBADO: 'var(--ucm-success)',
      RECHAZADO: 'var(--ucm-danger)',
    };
    return { background: colors[estado], color: '#fff' };
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
