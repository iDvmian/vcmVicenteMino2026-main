import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SolicitudesService, CreateSolicitudDto, UpdateSolicitudDto, GestionarSolicitudDto } from '../../core/services/solicitudes.service';
import { CarrerasService } from '../../core/services/carreras.service';
import { AuthService } from '../../core/services/auth.service';
import { Solicitud, EstadoSolicitud } from '../../core/models/solicitud.model';
import { COMUNAS_MAULE } from '../../core/constants/comunas-maule';


interface CarreraOption {
  id: number;
  label: string;
  facultadId?: number;
}

interface ActiveFilter {
  key: 'estado' | 'facultad' | 'carrera' | 'ciudad' | 'solicitante' | 'fechaDesde' | 'fechaHasta';
  label: string;
}

@Component({
  selector: 'app-solicitudes',
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
  templateUrl: './solicitudes.component.html',
  styleUrl: './solicitudes.component.scss',
})
export class SolicitudesComponent implements OnInit {
  items: Solicitud[] = [];
  totalRecords = 0;
  loading = false;
  readonly rows = 10;
  currentPage = 1;

  selectedEstado: EstadoSolicitud | null = null;
  selectedCarreraId: number | null = null;
  selectedCiudad: string | null = null;
  selectedFacultadId: number | null = null;
  facultadesDropdown: { id: number; label: string }[] = [];
  fechaDesde = '';
  fechaHasta = '';
  solicitanteTexto = '';
  showAdvanced = false;
  private solicitanteTimer: ReturnType<typeof setTimeout> | null = null;

  /** Facultad y carrera no aplican a quienes ya están limitados a su carrera. */
  get canFilterByCareer(): boolean {
    return this.useAllEndpoint && !['DOCENTE', 'ENCARGADO_CARRERA'].includes(this.currentUser?.rol ?? '');
  }

  /** Carreras de la facultad elegida (o todas si no hay facultad). */
  get carrerasFiltradas(): CarreraOption[] {
    return this.selectedFacultadId === null
      ? this.carrerasDropdown
      : this.carrerasDropdown.filter(c => c.facultadId === this.selectedFacultadId);
  }

  /** Cantidad de filtros activos dentro del panel, para el contador del botón. */
  get advancedCount(): number {
    return [
      this.selectedFacultadId !== null,
      this.selectedCarreraId !== null,
      !!this.solicitanteTexto.trim(),
      !!this.fechaDesde,
      !!this.fechaHasta,
    ].filter(Boolean).length;
  }

  selectedOrden: 'recientes' | 'antiguas' = 'recientes';
  carrerasDropdown: CarreraOption[] = [];
  readonly comunasMaule = COMUNAS_MAULE;

  readonly ordenOptions = [
    { label: 'Más recientes primero', value: 'recientes' },
    { label: 'Más antiguas primero', value: 'antiguas' },
  ];

  /** Filtros activos, para mostrarlos como etiquetas bajo la barra. */
  get activeFilters(): ActiveFilter[] {
    const filtros: ActiveFilter[] = [];
    if (this.selectedEstado !== null) {
      const e = this.estadoOptions.find(o => o.value === this.selectedEstado);
      filtros.push({ key: 'estado', label: e?.label ?? String(this.selectedEstado) });
    }
    if (this.selectedCiudad) {
      filtros.push({ key: 'ciudad', label: this.selectedCiudad });
    }
    if (this.selectedFacultadId !== null) {
      const f = this.facultadesDropdown.find(o => o.id === this.selectedFacultadId);
      filtros.push({ key: 'facultad', label: f?.label ?? 'Facultad' });
    }
    if (this.selectedCarreraId !== null) {
      const c = this.carrerasDropdown.find(o => o.id === this.selectedCarreraId);
      filtros.push({ key: 'carrera', label: c?.label ?? 'Carrera' });
    }
    if (this.solicitanteTexto.trim()) {
      filtros.push({ key: 'solicitante', label: `Solicitante: ${this.solicitanteTexto.trim()}` });
    }
    if (this.fechaDesde) filtros.push({ key: 'fechaDesde', label: `Desde ${this.formatFecha(this.fechaDesde)}` });
    if (this.fechaHasta) filtros.push({ key: 'fechaHasta', label: `Hasta ${this.formatFecha(this.fechaHasta)}` });
    return filtros;
  }

  private formatFecha(iso: string): string {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  }

  readonly estadoOptions: { label: string; value: EstadoSolicitud }[] = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Aprobada', value: 'APROBADA' },
    { label: 'Rechazada', value: 'RECHAZADA' },
  ];

  readonly gestionarEstadoOptions: { label: string; value: EstadoSolicitud }[] = [
    { label: 'Aprobada', value: 'APROBADA' },
    { label: 'Rechazada', value: 'RECHAZADA' },
  ];

  // Modal crear / editar
  dialogVisible = false;
  editingItem: Solicitud | null = null;
  viewOnly = false;
  saving = false;
  form: FormGroup;

  // Archivos (dentro del modal editar)
  uploadingFile = false;

  // Modal gestionar
  gestionarDialogVisible = false;
  gestionarItem: Solicitud | null = null;
  gestionarSaving = false;
  gestionarForm: FormGroup;

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private service: SolicitudesService,
    private carrerasService: CarrerasService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(140)]],
      descripcion: ['', [Validators.required, Validators.maxLength(560)]],
      ciudad: [null, Validators.required],
      direccion: ['', [Validators.required, Validators.maxLength(150)]],
      numeroDireccion: ['', Validators.maxLength(10)],
      telefono: ['', [Validators.required, Validators.pattern(/^\+?[\d\s]{8,20}$/)]],
      carreraId: [null],
    });

    this.gestionarForm = this.fb.group({
      estado: [null, Validators.required],
      carreraId: [null],
    });
  }

  get currentUser() { return this.authService.getCurrentUser(); }
  get isAdmin() { return this.currentUser?.rol === 'ADMIN'; }
  get canGestionar() { return ['ADMIN', 'GESTOR_VCM'].includes(this.currentUser?.rol ?? ''); }
  get useAllEndpoint() { return ['ADMIN', 'GESTOR_VCM', 'ENCARGADO_CARRERA', 'DOCENTE', 'DECANO'].includes(this.currentUser?.rol ?? ''); }
  get canCreateSolicitud() { return ['ADMIN', 'GESTOR_VCM', 'CLIENTE'].includes(this.currentUser?.rol ?? ''); }
  get gestionarEstadoValue(): string { return this.gestionarForm.get('estado')?.value ?? ''; }

  canEdit(s: Solicitud): boolean {
    return s.estado === 'PENDIENTE' && (s.clienteId === this.currentUser?.id || this.isAdmin);
  }

  canDelete(s: Solicitud): boolean {
    return this.canEdit(s);
  }

  ngOnInit(): void {
    this.loadCarrerasDropdown();
    this.loadItems();
  }

  loadCarrerasDropdown(): void {
    this.carrerasService.getCarreras({ limit: 100 }).subscribe({
      next: (res) => {
        const user = this.currentUser;
        const restricted = user && ['DOCENTE', 'ENCARGADO_CARRERA'].includes(user.rol);
        const items = restricted && user?.carreraId
          ? res.items.filter(c => c.id === user!.carreraId)
          : res.items;
        this.carrerasDropdown = items.map(c => ({
          id: c.id,
          facultadId: c.facultadId,
          label: `${c.nombre} (${c.facultad?.etiqueta ?? ''})`,
        }));

        const facultades = new Map<number, string>();
        items.forEach(c => {
          if (c.facultad) facultades.set(c.facultad.id, c.facultad.nombre);
        });
        this.facultadesDropdown = [...facultades.entries()]
          .map(([id, label]) => ({ id, label }))
          .sort((a, b) => a.label.localeCompare(b.label));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  loadItems(): void {
    this.loading = true;
    const params: Record<string, any> = { page: this.currentPage, limit: this.rows };
    if (this.selectedEstado !== null) params['estado'] = this.selectedEstado;
    if (this.selectedCarreraId !== null) params['carreraId'] = this.selectedCarreraId;
    if (this.selectedCiudad) params['ciudad'] = this.selectedCiudad;
    params['orden'] = this.selectedOrden;
    if (this.selectedFacultadId !== null) params['facultadId'] = this.selectedFacultadId;
    if (this.fechaDesde) params['fechaDesde'] = this.fechaDesde;
    if (this.fechaHasta) params['fechaHasta'] = this.fechaHasta;
    if (this.solicitanteTexto.trim()) params['solicitante'] = this.solicitanteTexto.trim();

    const obs = this.useAllEndpoint
      ? this.service.getAll(params)
      : this.service.getMisSolicitudes(params);

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
        this.showError('Error al cargar las solicitudes');
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
    this.selectedCarreraId = null;
    this.selectedFacultadId = null;
    this.selectedCiudad = null;
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.solicitanteTexto = '';
    this.currentPage = 1;
    this.loadItems();
  }

  removeFilter(key: ActiveFilter['key']): void {
    if (key === 'estado') this.selectedEstado = null;
    if (key === 'ciudad') this.selectedCiudad = null;
    if (key === 'facultad') { this.selectedFacultadId = null; this.selectedCarreraId = null; }
    if (key === 'carrera') this.selectedCarreraId = null;
    if (key === 'solicitante') this.solicitanteTexto = '';
    if (key === 'fechaDesde') this.fechaDesde = '';
    if (key === 'fechaHasta') this.fechaHasta = '';
    this.onFilterChange();
  }

  /** Al cambiar de facultad, se limpia la carrera para no dejar una combinación imposible. */
  onFacultadChange(): void {
    this.selectedCarreraId = null;
    this.onFilterChange();
  }

  /** Espera un momento después de escribir para no consultar en cada letra. */
  onSolicitanteInput(): void {
    if (this.solicitanteTimer) clearTimeout(this.solicitanteTimer);
    this.solicitanteTimer = setTimeout(() => this.onFilterChange(), 400);
  }

  openCreate(): void {
    this.editingItem = null;
    this.viewOnly = false;
    this.form.reset();
    this.form.enable();
    this.dialogVisible = true;
  }

  openEdit(item: Solicitud, readonly = false): void {
    this.editingItem = item;
    this.viewOnly = readonly;
    this.form.patchValue({
      titulo: item.titulo,
      descripcion: item.descripcion,
      ciudad: item.ciudad ?? null,
      direccion: item.direccion ?? '',
      numeroDireccion: item.numeroDireccion ?? '',
      telefono: item.telefono ?? '',
      carreraId: item.carreraId ?? null,
    });
    if (readonly) {
      this.form.disable();
    } else {
      this.form.enable();
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
      const dto: UpdateSolicitudDto = {
        titulo: raw.titulo,
        descripcion: raw.descripcion,
        ciudad: raw.ciudad,
        direccion: raw.direccion.trim(),
        numeroDireccion: raw.numeroDireccion?.trim() || null,
        telefono: raw.telefono.trim(),
        carreraId: raw.carreraId || undefined,
      };
      this.service.update(this.editingItem.id, dto).subscribe({
        next: () => this.onSaveSuccess('Solicitud actualizada'),
        error: (err: any) => this.onSaveError(err),
      });
    } else {
      const dto: CreateSolicitudDto = {
        titulo: raw.titulo,
        descripcion: raw.descripcion,
        ciudad: raw.ciudad,
        direccion: raw.direccion.trim(),
        numeroDireccion: raw.numeroDireccion?.trim() || undefined,
        telefono: raw.telefono.trim(),
        carreraId: raw.carreraId || undefined,
      };
      this.service.create(dto).subscribe({
        next: () => this.onSaveSuccess('Solicitud creada'),
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
    this.showError(err?.error?.message || 'Error al guardar la solicitud');
  }

  confirmDelete(item: Solicitud): void {
    this.confirmationService.confirm({
      message: `¿Eliminar la solicitud "${item.titulo}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.deleteItem(item),
    });
  }

  private deleteItem(item: Solicitud): void {
    this.service.delete(item.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'Solicitud eliminada correctamente', life: 3000 });
        this.currentPage = 1;
        this.cdr.detectChanges();
        this.loadItems();
      },
      error: (err: any) => {
        this.cdr.detectChanges();
        this.showError(err?.error?.message || 'No se pudo eliminar la solicitud');
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
  openGestionar(item: Solicitud): void {
    this.gestionarItem = item;
    this.gestionarForm.reset();
    this.gestionarDialogVisible = true;
  }

  saveGestionar(): void {
    if (this.gestionarForm.invalid) {
      this.gestionarForm.markAllAsTouched();
      return;
    }
    const raw = this.gestionarForm.value;
    this.gestionarSaving = true;
    const dto: GestionarSolicitudDto = {
      estado: raw.estado,
      carreraId: raw.carreraId || undefined,
    };
    this.service.gestionar(this.gestionarItem!.id, dto).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Solicitud gestionada correctamente', life: 3000 });
        this.gestionarDialogVisible = false;
        this.gestionarSaving = false;
        this.cdr.detectChanges();
        this.currentPage = 1;
        this.loadItems();
      },
      error: (err: any) => {
        this.gestionarSaving = false;
        this.cdr.detectChanges();
        this.showError(err?.error?.message || 'Error al gestionar la solicitud');
      },
    });
  }

  getEstadoStyle(estado: EstadoSolicitud): Record<string, string> {
    const colors: Record<EstadoSolicitud, string> = {
      PENDIENTE: 'var(--ucm-warning)',
      APROBADA: 'var(--ucm-success)',
      RECHAZADA: 'var(--ucm-danger)',
    };
    return { background: colors[estado], color: '#fff' };
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
