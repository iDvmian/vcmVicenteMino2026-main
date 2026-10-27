import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/** Protege rutas autenticadas: redirige a /login si no hay token */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (localStorage.getItem('vcm_token')) return true;
  router.navigate(['/login']);
  return false;
};

/** Protege rutas públicas: redirige a /dashboard si el usuario ya tiene sesión */
export const noAuthGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (localStorage.getItem('vcm_token')) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};

/** Bloquea rutas para el solicitante (CLIENTE): lo devuelve al dashboard */
export const noClienteGuard: CanActivateFn = () => {
  const router = inject(Router);
  try {
    const user = JSON.parse(localStorage.getItem('vcm_user') ?? 'null');
    if (user?.rol === 'CLIENTE') {
      router.navigate(['/dashboard']);
      return false;
    }
  } catch {
    // si el dato guardado está dañado, se deja pasar: el backend igual valida los permisos
  }
  return true;
};

/** Bloquea rutas de configuración (facultades, carreras, usuarios) para el solicitante, el encargado de carrera y el docente */
export const soloGestionGuard: CanActivateFn = () => {
  const router = inject(Router);
  try {
    const user = JSON.parse(localStorage.getItem('vcm_user') ?? 'null');
    if (user?.rol === 'CLIENTE' || user?.rol === 'ENCARGADO_CARRERA' || user?.rol === 'DOCENTE') {
      router.navigate(['/dashboard']);
      return false;
    }
  } catch {
    // si el dato guardado está dañado, se deja pasar: el backend igual valida los permisos
  }
  return true;
};

/** Permite la ruta solo a los roles indicados; el resto vuelve al dashboard (el backend igual valida los permisos). */
export const soloRolesGuard = (...roles: string[]): CanActivateFn => () => {
  const router = inject(Router);
  try {
    const user = JSON.parse(localStorage.getItem('vcm_user') ?? 'null');
    if (user?.rol && !roles.includes(user.rol)) {
      router.navigate(['/dashboard']);
      return false;
    }
  } catch {
    // si el dato guardado está dañado, se deja pasar: el backend igual valida los permisos
  }
  return true;
};
