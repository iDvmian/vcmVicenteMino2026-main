/**
 * Borra SOLO los datos creados por prisma/seed-demo.js
 * (correos @demo.vcm.test y solicitudes cuyo título empieza con "[DEMO]").
 * Uso (desde la carpeta backend):   node prisma/borrar-demo.js
 */
try { require('dotenv').config(); } catch (_) {}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const solDemo = { titulo: { startsWith: '[DEMO]' } };
  const proyDemo = { planteamiento: { solicitud: solDemo } };

  const r = {};
  r.proyectoAlumno = (await prisma.proyectoAlumno.deleteMany({ where: { OR: [{ proyecto: proyDemo }, { alumno: { email: { endsWith: '@demo.vcm.test' } } }] } })).count;
  r.observaciones = (await prisma.observacion.deleteMany({ where: { proyecto: proyDemo } })).count;
  r.archivosProyecto = (await prisma.archivoProyecto.deleteMany({ where: { proyecto: proyDemo } })).count;
  r.proyectos = (await prisma.proyecto.deleteMany({ where: proyDemo })).count;
  r.archivosPlanteamiento = (await prisma.archivoPlanteamiento.deleteMany({ where: { planteamiento: { solicitud: solDemo } } })).count;
  r.planteamientos = (await prisma.planteamiento.deleteMany({ where: { solicitud: solDemo } })).count;
  r.archivosSolicitud = (await prisma.archivoSolicitud.deleteMany({ where: { solicitud: solDemo } })).count;
  r.solicitudes = (await prisma.solicitud.deleteMany({ where: solDemo })).count;
  r.alumnos = (await prisma.alumnoVoluntario.deleteMany({ where: { email: { endsWith: '@demo.vcm.test' } } })).count;
  r.usuarios = (await prisma.user.deleteMany({ where: { email: { endsWith: '@demo.vcm.test' } } })).count;

  console.log('Datos demo eliminados:', r);
}

main()
  .catch((e) => { console.error('Error al borrar datos demo:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
