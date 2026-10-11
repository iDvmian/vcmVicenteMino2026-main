import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FacultadesService } from '../../core/services/facultades.service';
import { AuthService } from '../../core/services/auth.service';
import { Facultad } from '../../core/models/facultad.model';

@Component({
  selector: 'app-facultades',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    TableModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './facultades.component.html',
  styleUrl: './facultades.component.scss',
})
export class FacultadesComponent implements OnInit {
  items: Facultad[] = [];
  totalRecords = 0;
  loading = false;
  readonly rows = 10;
  currentPage = 1;

  dialogVisible = false;
  editingItem: Facultad | null = null;
  saving = false;
  form: FormGroup;

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private service: FacultadesService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      etiqueta: ['', Validators.required],
    });
  }

  get isAdmin(): boolean {
    return this.authService.getCurrentUser()?.rol === 'ADMIN';
  }

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.loading = true;
    this.service.getFacultades({ page: this.currentPage, limit: this.rows }).subscribe({
      next: (res) => {
        this.items = res.items;
        this.totalRecords = res.total;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.showError('Error al cargar las facultades');
      },
    });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.currentPage = (event.first ?? 0) / (event.rows ?? this.rows) + 1;
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

  openEdit(item: Facultad): void {
    this.editingItem = item;
    this.form.patchValue({ nombre: item.nombre, etiqueta: item.etiqueta });
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
      ? this.service.actualizarFacultad(this.editingItem.id, data)
      : this.service.crearFacultad(data);

    obs.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.editingItem ? 'Facultad actualizada' : 'Facultad creada',
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
        this.showError(err?.error?.message || 'Error al guardar la facultad');
      },
    });
  }

  confirmDelete(item: Facultad): void {
    this.confirmationService.confirm({
      message: `¿Eliminar la facultad "${item.nombre}"? Si tiene carreras asociadas, no podrá eliminarse.`,
      header: 'Confirmar eliminación',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.deleteItem(item),
    });
  }

  private deleteItem(item: Facultad): void {
    this.service.eliminarFacultad(item.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Facultad eliminada correctamente',
          life: 3000,
        });
        this.currentPage = 1;
        this.cdr.detectChanges();
        this.loadItems();
      },
      error: (err) => {
        this.cdr.detectChanges();
        this.showError(err?.error?.message || 'No se pudo eliminar la facultad');
      },
    });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
