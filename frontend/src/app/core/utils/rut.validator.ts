import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Valida un RUT chileno (formato 12345678-9) con el algoritmo módulo 11. */
export function esRutValido(rut: string): boolean {
  const limpio = (rut ?? '').replace(/\./g, '').trim().toUpperCase();
  if (!/^\d{1,8}-[\dK]$/.test(limpio)) return false;

  const [cuerpo, dv] = limpio.split('-');
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === esperado;
}

/** Validador para formularios reactivos de Angular. */
export function rutValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null; // "required" se encarga de los vacíos
  return esRutValido(control.value) ? null : { rutInvalido: true };
}