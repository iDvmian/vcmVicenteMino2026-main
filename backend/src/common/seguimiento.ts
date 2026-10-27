import { EtapaSeguimiento } from '@prisma/client';

/** Cualquier cliente de Prisma (normal o dentro de una transacción). */
type Db = { historialEtapa: { create: (args: any) => Promise<unknown> } };

/**
 * Registra un hito en el seguimiento de una iniciativa (solicitud → planteamiento → proyecto).
 * Solo agrega registros; nunca edita ni borra. Un fallo aquí no debe romper la operación principal,
 * por eso se captura el error (salvo dentro de una transacción, donde se pasa `tx` y se propaga).
 */
export async function registrarEtapa(
  db: Db,
  solicitudId: number,
  etapa: EtapaSeguimiento,
  usuarioId?: number | null,
  opts: { propagarError?: boolean } = {},
): Promise<void> {
  try {
    await db.historialEtapa.create({
      data: { solicitudId, etapa, usuarioId: usuarioId ?? null },
    });
  } catch (err) {
    if (opts.propagarError) throw err;
    console.error('[Seguimiento] No se pudo registrar la etapa', etapa, 'de la solicitud', solicitudId, err);
  }
}
