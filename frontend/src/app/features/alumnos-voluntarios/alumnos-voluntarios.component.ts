import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AlumnosVoluntariosService, CreateAlumnoDto, UpdateAlumnoDto } from '../../core/services/alumnos-voluntarios.service';
import { CarrerasService } from '../../core/services/carreras.service';
import { AuthService } from '../../core/services/auth.service';
import { AlumnoVoluntario } from '../../core/models/alumno-voluntario.model';
import { Carrera } from '../../core/models/carrera.model';
import { Role } from '../../core/models/user.model';
import { rutValidator } from '../../core/utils/rut.validator';

interface CarreraOption extends Carrera {
  label: string;
}

const ROLES_CREATE: Role[] = ['ADMIN', 'ENCARGADO_CARRERA'];
const ROLES_EDIT: Role[] = ['ADMIN', 'ENCARGADO_CARRERA'];
const ROLES_DELETE: Role[] = ['ADMIN', 'ENCARGADO_CARRERA'];

@Component({
  selector: 'app-alumnos-voluntarios',
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
    ToggleSwitchModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './alumnos-voluntarios.component.html',
  styleUrl: './alumnos-voluntarios.component.scss',
})
export class AlumnosVoluntariosComponent implements OnInit {
  items: AlumnoVoluntario[] = [];
  totalRecords = 0;
  loading = false;
  readonly rows = 10;
  currentPage = 1;

  selectedCarreraId: number | null = null;
  selectedEstado: boolean | null = null;
  carrerasDropdown: CarreraOption[] = [];

  readonly estadoOptions = [
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false },
  ];

  dialogVisible = false;
  editingItem: AlumnoVoluntario | null = null;
  saving = false;
  form: FormGroup;

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private service: AlumnosVoluntariosService,
    private carrerasService: CarrerasService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      rut: ['', [Validators.required, rutValidator]],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: [''],
      carreraId: [null, Validators.required],
      estado: [true],
    });
  }

  get canCreate(): boolean {
    const rol = this.authService.getCurrentUser()?.rol;
    return !!rol && (ROLES_CREATE as string[]).includes(rol);
  }

  get canEdit(): boolean {
    const rol = this.authService.getCurrentUser()?.rol;
    return !!rol && (ROLES_EDIT as string[]).includes(rol);
  }

  get canDelete(): boolean {
    const rol = this.authService.getCurrentUser()?.rol;
    return !!rol && (ROLES_DELETE as string[]).includes(rol);
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user?.rol === 'CLIENTE') {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.loadCarrerasDropdown();
    this.loadItems();
  }

  loadCarrerasDropdown(): void {
    this.carrerasService.getCarreras({ limit: 100 }).subscribe({
      next: (res) => {
        // El encargado y el docente solo ven alumnos de su propia carrera
        const user = this.authService.getCurrentUser();
        const items = user?.rol === 'ENCARGADO_CARRERA' || user?.rol === 'DOCENTE'
          ? res.items.filter((c) => c.id === user.carreraId)
          : res.items;
        this.carrerasDropdown = items.map((c) => ({
          ...c,
          label: `${c.nombre} (${c.facultad?.etiqueta ?? ''})`,
        }));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  loadItems(): void {
    this.loading = true;
    const params: { carreraId?: number; estado?: boolean; page: number; limit: number } = {
      page: this.currentPage,
      limit: this.rows,
    };
    if (this.selectedCarreraId !== null) params.carreraId = this.selectedCarreraId;
    if (this.selectedEstado !== null) params.estado = this.selectedEstado;

    this.service.getAll(params).subscribe({
      next: (res) => {
        this.items = res.items;
        this.totalRecords = res.total;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.showError('Error al cargar los alumnos voluntarios');
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
    this.selectedCarreraId = null;
    this.selectedEstado = null;
    this.currentPage = 1;
    this.loadItems();
  }

  openCreate(): void {
    this.editingItem = null;
    this.form.reset({
      estado: true,
      carreraId: this.carrerasDropdown.length === 1 ? this.carrerasDropdown[0].id : null,
    });
    this.dialogVisible = true;
  }

  openEdit(item: AlumnoVoluntario): void {
    this.editingItem = item;
    this.form.patchValue({
      rut: item.rut,
      nombres: item.nombres,
      apellidos: item.apellidos,
      email: item.email,
      telefono: item.telefono ?? '',
      carreraId: item.carreraId,
      estado: item.estado,
    });
    this.dialogVisible = true;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const raw = this.form.value;

    if (this.editingItem) {
      const dto: UpdateAlumnoDto = {
        nombres: raw.nombres,
        apellidos: raw.apellidos,
        email: raw.email,
        telefono: raw.telefono || null,
        carreraId: raw.carreraId,
        estado: raw.estado,
      };
      this.service.update(this.editingItem.id, dto).subscribe({
        next: () => this.onSaveSuccess('Alumno voluntario actualizado'),
        error: (err) => this.onSaveError(err),
      });
    } else {
      const dto: CreateAlumnoDto = {
        rut: raw.rut,
        nombres: raw.nombres,
        apellidos: raw.apellidos,
        email: raw.email,
        telefono: raw.telefono || null,
        carreraId: raw.carreraId,
      };
      this.service.create(dto).subscribe({
        next: () => this.onSaveSuccess('Alumno voluntario creado'),
        error: (err) => this.onSaveError(err),
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
    this.showError(err?.error?.message || 'Error al guardar el alumno voluntario');
  }

  confirmDelete(item: AlumnoVoluntario): void {
    this.confirmationService.confirm({
      message: `¿Eliminar al alumno "${item.nombres} ${item.apellidos}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.deleteItem(item),
    });
  }

  private deleteItem(item: AlumnoVoluntario): void {
    this.service.delete(item.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Alumno voluntario eliminado correctamente',
          life: 3000,
        });
        this.currentPage = 1;
        this.cdr.detectChanges();
        this.loadItems();
      },
      error: (err) => {
        this.cdr.detectChanges();
        this.showError(err?.error?.message || 'No se pudo eliminar el alumno voluntario');
      },
    });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
