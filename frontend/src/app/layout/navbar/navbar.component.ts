import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  constructor(private authService: AuthService, private router: Router) {}

  get currentUser(): User | null {
    return this.authService.getCurrentUser();
  }

  /** Decano y Admin ven el panel de indicadores; el resto, su pantalla de inicio. */
  get inicioLabel(): string {
    const rol = this.currentUser?.rol;
    return rol === 'DECANO' || rol === 'ADMIN' ? 'Panel de indicadores' : 'Inicio';
  }

  // Facultades, Carreras y Usuarios son de configuración: no se muestran al solicitante
  // (CLIENTE), al encargado de carrera ni al docente.
  get showFacultadesCarreras(): boolean {
    const rol = this.authService.getCurrentUser()?.rol;
    return !!rol && rol !== 'CLIENTE' && rol !== 'ENCARGADO_CARRERA' && rol !== 'DOCENTE';
  }

  get showUsuarios(): boolean {
    const rol = this.authService.getCurrentUser()?.rol;
    return !!rol && rol !== 'CLIENTE' && rol !== 'ENCARGADO_CARRERA' && rol !== 'DOCENTE';
  }

  get showAlumnosVoluntarios(): boolean {
    const rol = this.authService.getCurrentUser()?.rol;
    return !!rol && rol !== 'CLIENTE';
  }

  get showPlanteamientos(): boolean {
    const rol = this.authService.getCurrentUser()?.rol;
    return !!rol && rol !== 'CLIENTE';
  }

  /** Historial de vinculaciones propias: solo para docentes. */
  get showMisVinculaciones(): boolean {
    return this.authService.getCurrentUser()?.rol === 'DOCENTE';
  }

  get showProyectos(): boolean {
    const rol = this.authService.getCurrentUser()?.rol;
    return !!rol && rol !== 'CLIENTE';
  }

  // Reportes excluye también a DOCENTE (no solo a CLIENTE): roles distintos
  // a los de los demás links, por eso no se reutiliza showUsuarios.
  get showReportes(): boolean {
    const rol = this.authService.getCurrentUser()?.rol;
    return ['ADMIN', 'GESTOR_VCM', 'ENCARGADO_CARRERA', 'DECANO'].includes(rol ?? '');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
