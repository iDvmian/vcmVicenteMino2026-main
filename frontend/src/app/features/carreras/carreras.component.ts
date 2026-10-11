import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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
import { CarrerasService } from '../../core/services/carreras.service';
import { FacultadesService } from '../../core/services/facultades.service';
import { AuthService } from '../../core/services/auth.service';
import { Carrera } from '../../core/models/carrera.model';
import { Facultad } from '../../core/models/facultad.model';

@Component({
  selector: 'app-carreras',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
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
  templateUrl: './carreras.component.html',
  styleUrl: './carreras.component.scss',
})
export class CarrerasComponent implements OnInit {
  items: Carrera[] = [];
  totalRecords = 0;
  loading = false;
  readonly rows = 10;
  currentPage = 1;

  facultadesDropdown: Facultad[] = [];
  selectedFacultadId: number | null = null;

  dialogVisible = false;
  editingItem: Carrera | null = null;
  saving = false;
  form: FormGroup;

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private service: CarrerasService,
    private facultadesService: FacultadesService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      etiqueta: ['', Validators.required],
      facultadId: [null, Validators.required],
    });
  }

  get isAdmin(): boolean {
    return this.authService.getCurrentUser()?.rol === 'ADMIN';
  }

  ngOnInit(): void {
    this.loadFacultadesDropdown();
    this.loadItems();
  }

  loadFacultadesDropdown(): void {
    this.facultadesService.getFacultades({ limit: 100 }).subscribe({
      next: (res) => {
        this.facultadesDropdown = res.items;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  loadItems(): void {
    this.loading = true;
    const params: { facultadId?: number; page: number; limit: number } = {
      page: this.currentPage,
      limit: this.rows,
    };
    if (this.selectedFacultadId !== null) params.facultadId = this.selectedFacultadId;

    this.service.getCarreras(params).subscribe({
      next: (res) => {
        this.items = res.items;
        this.totalRecords = res.total;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.showError('Error al cargar las carreras');
      },
    });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.currentPage = (event.first ?? 0) / (event.rows ?? this.rows) + 1;
    this.loadItems();
  }

  onFacultadFilterChange(): void {
    this.currentPage = 1;
    this.loadItems();
  }

  clearFilters(): void {
    this.selectedFacultadId = null;
    this.currentPage = 1;
    this.loadItems();
  }

  onEtiquetaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    this.form.get('etiqueta')!.setValue(upper, { emitEvent: false });
    input.value = upper;
  }

  openCreate(): void {
    this.editingItem = null;
    this.form.reset();
    this.dialogVisible = true;
  }

  openEdit(item: Carrera): void {
    this.editingItem = item;
    this.form.patchValue({
      nombre: item.nombre,
      etiqueta: item.etiqueta,
      facultadId: item.facultadId,
    });
    this.dialogVisible = true;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const data = this.form.value;
    const obs = this.editingItem
      ? this.service.actualizarCarrera(this.editingItem.id, data)
      : this.service.crearCarrera(data);

    obs.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.editingItem ? 'Carrera actualizada' : 'Carrera creada',
          life: 3000,
        });
        this.dialogVisible = false;
        this.currentPage = 1;
        this.saving = false;
        this.cdr.detectChanges();
        this.loadItems();
      },
      error: (err) => {
        this.saving = false;
        this.cdr.detectChanges();
        this.showError(err?.error?.message || 'Error al guardar la carrera');
      },
    });
  }

  confirmDelete(item: Carrera): void {
    this.confirmationService.confirm({
      message: `¿Eliminar la carrera "${item.nombre}"? Si tiene usuarios o alumnos voluntarios asociados, no podrá eliminarse.`,
      header: 'Confirmar eliminación',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.deleteItem(item),
    });
  }

  private deleteItem(item: Carrera): void {
    this.service.eliminarCarrera(item.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Carrera eliminada correctamente',
          life: 3000,
        });
        this.currentPage = 1;
        this.cdr.detectChanges();
        this.loadItems();
      },
      error: (err) => {
        this.cdr.detectChanges();
        this.showError(err?.error?.message || 'No se pudo eliminar la carrera');
      },
    });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
