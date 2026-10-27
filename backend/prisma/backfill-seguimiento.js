/**
 * Rellena (de forma APROXIMADA) el seguimiento de lo que ya existía antes de crear HistorialEtapa.
 * Usa createdAt / updatedAt: las fechas de aprobación, rechazo o cambio de estado son updatedAt
 * (pueden ser más tardías si el registro se editó después). Los registros quedan con aproximado = true.
 * Es seguro ejecutarlo más de una vez: omite las solicitudes que ya tienen historial.
 *
 * Uso (desde la carpeta backend):  node prisma/backfill-seguimiento.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const solicitudes = await prisma.solicitud.findMany({
    where: { historial: { none: {} } },
    include: { planteamiento: { include: { proyecto: true } } },
  });

  const filas = [];
  const add = (solicitudId, etapa, fecha) =>
    filas.push({ solicitudId, etapa, fecha, aproximado: true });

  for (const s of solicitudes) {
    add(s.id, 'SOLICITUD_CREADA', s.createdAt);
    if (s.estado === 'APROBADA') add(s.id, 'SOLICITUD_APROBADA', s.updatedAt);
    if (s.estado === 'RECHAZADA') add(s.id, 'SOLICITUD_RECHAZADA', s.updatedAt);

    const pl = s.planteamiento;
    if (pl) {
      add(s.id, 'PLANTEAMIENTO_CREADO', pl.createdAt);
      if (pl.estado === 'APROBADO') add(s.id, 'PLANTEAMIENTO_APROBADO', pl.updatedAt);
      if (pl.estado === 'RECHAZADO') add(s.id, 'PLANTEAMIENTO_RECHAZADO', pl.updatedAt);

      const pr = pl.proyecto;
      if (pr) {
        add(s.id, 'PROYECTO_CREADO', pr.createdAt);
        add(s.id, 'PROYECTO_EN_PROCESO', pr.createdAt);
        if (pr.estado !== 'EN_PROCESO') add(s.id, `PROYECTO_${pr.estado}`, pr.updatedAt);
      }
    }
  }

  // Evita fechas anteriores a la etapa previa por diferencias mínimas (updatedAt >= createdAt siempre)
  const LOTE = 500;
  for (let i = 0; i < filas.length; i += LOTE) {
    await prisma.historialEtapa.createMany({ data: filas.slice(i, i + LOTE) });
  }

  console.log(`Solicitudes procesadas: ${solicitudes.length} | registros creados: ${filas.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
