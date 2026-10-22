import { Routes } from '@angular/router';
import { authGuard, noAuthGuard, noClienteGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Rutas públicas — redirigen a /dashboard si ya hay sesión activa
  { path: 'login',            component: LoginComponent,           canActivate: [noAuthGuard] },
  { path: 'register',         component: RegisterComponent,        canActivate: [noAuthGuard] },
  { path: 'forgot-password',  component: ForgotPasswordComponent,  canActivate: [noAuthGuard] },

  // Rutas protegidas dentro del layout principal
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/perfil/perfil.component').then(m => m.PerfilComponent),
      },
      {
        path: 'dashboard/facultades',
        canActivate: [noClienteGuard],
        loadComponent: () =>
          import('./features/facultades/facultades.component').then(m => m.FacultadesComponent),
      },
      {
        path: 'dashboard/carreras',
        canActivate: [noClienteGuard],
        loadComponent: () =>
          import('./features/carreras/carreras.component').then(m => m.CarrerasComponent),
      },
      {
        path: 'dashboard/usuarios',
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent),
      },
      {
        path: 'dashboard/alumnos-voluntarios',
        loadComponent: () =>
          import('./features/alumnos-voluntarios/alumnos-voluntarios.component').then(m => m.AlumnosVoluntariosComponent),
      },
      {
        path: 'dashboard/solicitudes',
        loadComponent: () =>
          import('./features/solicitudes/solicitudes.component').then(m => m.SolicitudesComponent),
      },
      {
        path: 'dashboard/planteamientos',
        loadComponent: () =>
          import('./features/planteamientos/planteamientos.component').then(m => m.PlanteamientosComponent),
      },
      {
        path: 'dashboard/proyectos',
        loadComponent: () =>
          import('./features/proyectos/proyectos.component').then(m => m.ProyectosComponent),
      },
      {
        path: 'dashboard/reportes',
        loadComponent: () =>
          import('./features/reportes/reportes.component').then(m => m.ReportesComponent),
      },
    ]
  },
];
