import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { UsuariosService } from '../../core/services/usuarios.service';
import { AuthService } from '../../core/services/auth.service';
import { Role, User } from '../../core/models/user.model';

const ROL_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  GESTOR_VCM: 'Gestor VCM',
  ENCARGADO_CARRERA: 'Encargado de carrera',
  DOCENTE: 'Docente',
  DECANO: 'Decano',
  CLIENTE: 'Cliente',
};

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, ToastModule],
  providers: [MessageService],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(UsuariosService);
  private auth = inject(AuthService);
  private toast = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  user: User | null = null;
  loading = true;
  saving = false;
  form: FormGroup = this.fb.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.maxLength(20)]],
  });

  ngOnInit(): void {
    this.service.getMiPerfil().subscribe({
      next: (u) => {
        this.setUser(u);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar tu perfil' });
        this.cdr.detectChanges();
      },
    });
  }

  get rolLabel(): string {
    return this.user ? ROL_LABEL[this.user.rol] ?? this.user.rol : '';
  }

  get carreraLabel(): string {
    const c = this.user?.carrera;
    if (!c) return '—';
    return c.facultad?.etiqueta ? `${c.nombre} · ${c.facultad.etiqueta}` : c.nombre;
  }

  get hasChanges(): boolean {
    return this.form.dirty;
  }

  private setUser(u: User): void {
    this.user = u;
    this.form.reset({
      nombres: u.nombres,
      apellidos: u.apellidos,
      email: u.email,
      telefono: u.telefono ?? '',
    });
  }

  cancel(): void {
    if (this.user) this.setUser(this.user);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.saving = true;
    this.service
      .actualizarMiPerfil({
        nombres: raw.nombres.trim(),
        apellidos: raw.apellidos.trim(),
        email: raw.email.trim(),
        telefono: raw.telefono?.trim() || null,
      })
      .subscribe({
        next: (u) => {
          this.setUser(u);
          // refresca el nombre que se muestra en el navbar
          this.auth.updateStoredUser({
            nombres: u.nombres,
            apellidos: u.apellidos,
            email: u.email,
            telefono: u.telefono,
          });
          this.saving = false;
          this.toast.add({ severity: 'success', summary: 'Listo', detail: 'Perfil actualizado' });
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.saving = false;
          const msg = err?.error?.message;
          this.toast.add({
            severity: 'error',
            summary: 'No se pudo guardar',
            detail: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Intenta nuevamente',
          });
          this.cdr.detectChanges();
        },
      });
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
}
