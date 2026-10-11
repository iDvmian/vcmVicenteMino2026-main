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
import { UsuariosService, CreateUsuarioDto, UpdateUsuarioDto } from '../../core/services/usuarios.service';
import { CarrerasService } from '../../core/services/carreras.service';
import { AuthService } from '../../core/services/auth.service';
import { User, Role } from '../../core/models/user.model';
import { Carrera } from '../../core/models/carrera.model';
import { rutValidator } from '../../core/utils/rut.validator';

interface CarreraOption extends Carrera {
  label: string;
}

@Component({
  selector: 'app-usuarios',
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
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss',
})
export class UsuariosComponent implements OnInit {
  items: User[] = [];
  totalRecords = 0;
  loading = false;
  readonly rows = 10;
  currentPage = 1;

  selectedRol: Role | null = null;
  selectedEstado: boolean | null = null;
  carrerasDropdown: CarreraOption[] = [];

  readonly rolOptions: { label: string; value: Role }[] = [
    { label: 'ADMIN', value: 'ADMIN' },
    { label: 'GESTOR_VCM', value: 'GESTOR_VCM' },
    { label: 'ENCARGADO_CARRERA', value: 'ENCARGADO_CARRERA' },
    { label: 'DOCENTE', value: 'DOCENTE' },
    { label: 'DECANO', value: 'DECANO' },
    { label: 'CLIENTE', value: 'CLIENTE' },
  ];

  readonly estadoOptions = [
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false },
  ];

  dialogVisible = false;
  editingItem: User | null = null;
  saving = false;
  form: FormGroup;

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private service: UsuariosService,
    private carrerasService: CarrerasService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
    //rut: ['', [Validators.required, Validators.pattern(/^\d{1,8}-[\dkK]$/)]],  dejar este para agilisar el ingreso de usuarios
      rut: ['', [Validators.required, rutValidator]],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: [''],
      password: [''],
      rol: [null, Validators.required],
      estado: [true],
      carreraId: [null],
    });
  }

  get isAdmin(): boolean {
    return this.authService.getCurrentUser()?.rol === 'ADMIN';
  }

  get currentUserId(): number | undefined {
    return this.authService.getCurrentUser()?.id;
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
        this.carrerasDropdown = res.items.map((c) => ({
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
    const params: { rol?: Role; estado?: boolean; page: number; limit: number } = {
      page: this.currentPage,
      limit: this.rows,
    };
    if (this.selectedRol !== null) params.rol = this.selectedRol;
    if (this.selectedEstado !== null) params.estado = this.selectedEstado;

    this.service.getUsuarios(params).subscribe({
      next: (res) => {
        this.items = res.items;
        this.totalRecords = res.total;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.showError('Error al cargar los usuarios');
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
    this.selectedRol = null;
    this.selectedEstado = null;
    this.currentPage = 1;
    this.loadItems();
  }

  getRolStyle(rol: Role): Record<string, string> {
    const colors: Record<Role, string> = {
      ADMIN: 'var(--ucm-azul)',
      GESTOR_VCM: 'var(--ucm-teal)',
      ENCARGADO_CARRERA: 'var(--ucm-warning)',
      DOCENTE: 'var(--ucm-success)',
      DECANO: 'var(--ucm-azul)',
      CLIENTE: 'var(--ucm-neutral)',
    };
    return { background: colors[rol] ?? 'var(--ucm-neutral)', color: '#fff' };
  }

  openCreate(): void {
    this.editingItem = null;
    this.form.reset({ estado: true });
    this.form.get('password')!.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.get('password')!.updateValueAndValidity();
    this.dialogVisible = true;
  }

  openEdit(item: User): void {
    this.editingItem = item;
    this.form.patchValue({
      rut: item.rut,
      nombres: item.nombres,
      apellidos: item.apellidos,
      email: item.email,
      telefono: item.telefono ?? '',
      rol: item.rol,
      estado: item.estado,
      carreraId: item.carreraId ?? null,
    });
    this.form.get('password')!.clearValidators();
    this.form.get('password')!.setValue('');
    this.form.get('password')!.updateValueAndValidity();
    this.dialogVisible = true;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;

    if (this.editingItem) {
      const raw = this.form.value;
      const dto: UpdateUsuarioDto = {
        nombres: raw.nombres,
        apellidos: raw.apellidos,
        email: raw.email,
        telefono: raw.telefono || null,
        rol: raw.rol,
        estado: raw.estado,
        carreraId: raw.carreraId || null,
      };
      this.service.actualizarUsuario(this.editingItem.id, dto).subscribe({
        next: () => this.onSaveSuccess('Usuario actualizado'),
        error: (err) => this.onSaveError(err),
      });
    } else {
      const raw = this.form.value;
      const dto: CreateUsuarioDto = {
        rut: raw.rut,
        nombres: raw.nombres,
        apellidos: raw.apellidos,
        email: raw.email,
        password: raw.password,
        rol: raw.rol,
        carreraId: raw.carreraId || null,
      };
      if (raw.telefono) dto.telefono = raw.telefono;
      this.service.crearUsuario(dto).subscribe({
        next: () => this.onSaveSuccess('Usuario creado'),
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
    this.showError(err?.error?.message || 'Error al guardar el usuario');
  }

  confirmDelete(item: User): void {
    this.confirmationService.confirm({
      message: `¿Eliminar al usuario "${item.nombres} ${item.apellidos}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.deleteItem(item),
    });
  }

  private deleteItem(item: User): void {
    this.service.eliminarUsuario(item.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Usuario eliminado correctamente',
          life: 3000,
        });
        this.currentPage = 1;
        this.cdr.detectChanges();
        this.loadItems();
      },
      error: (err) => {
        this.cdr.detectChanges();
        this.showError(err?.error?.message || 'No se pudo eliminar el usuario');
      },
    });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 4000 });
  }
}
