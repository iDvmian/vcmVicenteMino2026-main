import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { registerDecorator, ValidationOptions } from 'class-validator';

/** Valida un RUT chileno (formato 12345678-9) con el algoritmo módulo 11. */
export function esRutValido(rut: unknown): boolean {
  if (typeof rut !== 'string') return false;
  if (!/^\d{1,8}-[\dK]$/.test(rut)) return false;

  const [cuerpo, dv] = rut.split('-');
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

/**
 * Decorador para DTOs. Normaliza el RUT (sin puntos, K en mayúscula)
 * y verifica el dígito verificador.
 */
export function IsRut(options?: ValidationOptions) {
  return applyDecorators(
    Transform(({ value }) =>
      typeof value === 'string'
        ? value.replace(/\./g, '').trim().toUpperCase()
        : value,
    ),
    (target: object, propertyKey: string | symbol) =>
      registerDecorator({
        name: 'isRut',
        target: target.constructor,
        propertyName: propertyKey as string,
        options: { message: 'RUT inválido', ...options },
        validator: { validate: (value: unknown) => esRutValido(value) },
      }),
  );
}