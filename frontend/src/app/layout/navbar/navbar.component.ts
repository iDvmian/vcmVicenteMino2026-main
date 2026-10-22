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

  // Facultades y Carreras no se muestran al solicitante (CLIENTE).
  get showFacultadesCarreras(): boolean {
    const rol = this.authService.getCurrentUser()?.rol;
    return !!rol && rol !== 'CLIENTE';
  }

  get showUsuarios(): boolean {
    const rol = this.authService.getCurrentUser()?.rol;
    return !!rol && rol !== 'CLIENTE';
  }

  get showAlumnosVoluntarios(): boolean {
    const rol = this.authService.getCurrentUser()?.rol;
    return !!rol && rol !== 'CLIENTE';
  }

  get showPlanteamientos(): boolean {
    const rol = this.authService.getCurrentUser()?.rol;
    return !!rol && rol !== 'CLIENTE';
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
