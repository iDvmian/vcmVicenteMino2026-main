import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUser } from '../auth/strategies/jwt.strategy';
import { facultadDelDecano } from '../common/alcance';
import { PrismaService } from '../prisma/prisma.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

const DIA_MS = 24 * 60 * 60 * 1000;

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (parte: number, total: number) => (total > 0 ? round1((parte / total) * 100) : 0);
const mesKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Todas las cifras parten de las SOLICITUDES recibidas en el período
   * (y carrera / tipo de intervención elegidos): sus planteamientos, proyectos,
   * docentes y alumnos se cuentan a partir de ahí, así el panel es coherente.
   */
  async getDashboard(query: QueryDashboardDto, user: CurrentUser) {
    const where: Prisma.SolicitudWhereInput = {};

    if (query.fechaDesde || query.fechaHasta) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.fechaDesde) createdAt.gte = new Date(`${query.fechaDesde}T00:00:00`);
      if (query.fechaHasta) createdAt.lte = new Date(`${query.fechaHasta}T23:59:59.999`);
      where.createdAt = createdAt;
    }
    // El Decano queda limitado a su facultad. Admin y Director ven todas; la facultad y la carrera
    // se filtran después en memoria para poder comparar todas las facultades entre sí.
    const facultadDecano = await facultadDelDecano(this.prisma, user);
    if (facultadDecano !== null) where.carrera = { is: { facultadId: facultadDecano } };
    const facultadSel = facultadDecano ?? query.facultadId;
    if (query.tipoIntervencion) {
      where.planteamiento = { is: { tipoIntervencion: query.tipoIntervencion } };
    }

    const todas = await this.prisma.solicitud.findMany({
      where,
      include: {
        carrera: {
          select: {
            id: true,
            nombre: true,
            etiqueta: true,
            facultadId: true,
            facultad: { select: { id: true, nombre: true, etiqueta: true } },
          },
        },
        planteamiento: {
          include: {
            docente: { select: { id: true, nombres: true, apellidos: true } },
            proyecto: {
              include: {
                alumnos: {
                  include: {
                    alumno: { select: { id: true, nombres: true, apellidos: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const solicitudes = todas.filter(
      (s) =>
        (facultadSel === undefined || s.carrera?.facultadId === facultadSel) &&
        (query.carreraId === undefined || s.carreraId === query.carreraId),
    );

    // ── Comparación entre facultades (sobre todas las visibles, sin filtrar por facultad/carrera) ──
    const facultades = new Map<number, {
      facultadId: number; facultad: string; etiqueta: string;
      solicitudes: number; aprobadas: number; rechazadas: number; pendientes: number;
      planteamientos: number; proyectos: number; finalizados: number;
      horasHombre: number; participantes: number; alumnos: Set<number>;
    }>();
    for (const s of todas) {
      if (!s.carrera) continue;
      const fid = s.carrera.facultadId;
      const f = facultades.get(fid) ?? {
        facultadId: fid, facultad: s.carrera.facultad.nombre, etiqueta: s.carrera.facultad.etiqueta,
        solicitudes: 0, aprobadas: 0, rechazadas: 0, pendientes: 0,
        planteamientos: 0, proyectos: 0, finalizados: 0, horasHombre: 0, participantes: 0, alumnos: new Set<number>(),
      };
      f.solicitudes++;
      if (s.estado === 'APROBADA') f.aprobadas++;
      else if (s.estado === 'RECHAZADA') f.rechazadas++;
      else f.pendientes++;
      const pl = s.planteamiento;
      if (pl) {
        f.planteamientos++;
        const pr = pl.proyecto;
        if (pr) {
          f.proyectos++;
          if (pr.estado === 'FINALIZADO') f.finalizados++;
          f.horasHombre += pl.horasHombre ?? 0;
          f.participantes += (pr.participantesDocentes ?? 0) + (pr.participantesEstudiantes ?? 0) +
            (pr.participantesDocentesExternos ?? 0) + (pr.participantesAlumnosExternos ?? 0) + (pr.participantesOtrosExternos ?? 0);
          for (const a of pr.alumnos) f.alumnos.add(a.alumnoId);
        }
      }
      facultades.set(fid, f);
    }
    const porFacultad = [...facultades.values()]
      .map(({ alumnos, ...f }) => ({ ...f, alumnosVoluntarios: alumnos.size, tasaConversion: pct(f.proyectos, f.solicitudes) }))
      .sort((a, b) => b.solicitudes - a.solicitudes);

    // ── Solicitudes ──────────────────────────────────────────────────────────
    const solPorEstado = { PENDIENTE: 0, APROBADA: 0, RECHAZADA: 0 };
    let sumaRespuestaMs = 0;
    let respondidas = 0;
    for (const s of solicitudes) {
      solPorEstado[s.estado]++;
      if (s.estado !== 'PENDIENTE') {
        sumaRespuestaMs += s.updatedAt.getTime() - s.createdAt.getTime();
        respondidas++;
      }
    }

    // ── Planteamientos y proyectos ───────────────────────────────────────────
    const planteamientos = solicitudes.flatMap((s) => (s.planteamiento ? [s.planteamiento] : []));
    const plantPorEstado = { PENDIENTE: 0, APROBADO: 0, RECHAZADO: 0 };
    for (const p of planteamientos) plantPorEstado[p.estado]++;

    const proyectos = planteamientos.flatMap((p) => (p.proyecto ? [{ ...p.proyecto, plant: p }] : []));
    const proyPorEstado = { EN_PROCESO: 0, PAUSADO: 0, FINALIZADO: 0, CANCELADO: 0 };
    let horasHombre = 0;
    let sumaDuracionMs = 0;
    const participantes = { docentes: 0, estudiantes: 0, docentesExternos: 0, alumnosExternos: 0, otrosExternos: 0 };
    const alumnosSet = new Set<number>();
    for (const pr of proyectos) {
      proyPorEstado[pr.estado]++;
      horasHombre += pr.plant.horasHombre ?? 0;
      sumaDuracionMs += pr.fechaFin.getTime() - pr.fechaInicio.getTime();
      participantes.docentes += pr.participantesDocentes ?? 0;
      participantes.estudiantes += pr.participantesEstudiantes ?? 0;
      participantes.docentesExternos += pr.participantesDocentesExternos ?? 0;
      participantes.alumnosExternos += pr.participantesAlumnosExternos ?? 0;
      participantes.otrosExternos += pr.participantesOtrosExternos ?? 0;
      for (const a of pr.alumnos) alumnosSet.add(a.alumnoId);
    }

    // ── Serie mensual ────────────────────────────────────────────────────────
    const meses = new Map<string, { solicitudes: number; proyectos: number }>();
    const slot = (k: string) => {
      if (!meses.has(k)) meses.set(k, { solicitudes: 0, proyectos: 0 });
      return meses.get(k)!;
    };
    for (const s of solicitudes) slot(mesKey(s.createdAt)).solicitudes++;
    for (const pr of proyectos) slot(mesKey(pr.fechaInicio)).proyectos++;
    const porMes = [...meses.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, v]) => ({ mes, ...v }));

    // ── Por tipo de intervención ─────────────────────────────────────────────
    const tipos = new Map<string, { planteamientos: number; proyectos: number; horasHombre: number }>();
    for (const p of planteamientos) {
      const k = p.tipoIntervencion ?? 'SIN_TIPO';
      const t = tipos.get(k) ?? { planteamientos: 0, proyectos: 0, horasHombre: 0 };
      t.planteamientos++;
      if (p.proyecto) {
        t.proyectos++;
        t.horasHombre += p.horasHombre ?? 0;
      }
      tipos.set(k, t);
    }
    const porTipoIntervencion = [...tipos.entries()]
      .map(([tipo, v]) => ({ tipo, ...v }))
      .sort((a, b) => b.planteamientos - a.planteamientos);

    // ── Por carrera ──────────────────────────────────────────────────────────
    const carreras = new Map<string, { carrera: string; etiqueta: string; solicitudes: number; proyectos: number }>();
    for (const s of solicitudes) {
      const k = s.carrera ? String(s.carrera.id) : 'sin';
      const c = carreras.get(k) ?? {
        carrera: s.carrera?.nombre ?? 'Sin carrera',
        etiqueta: s.carrera?.etiqueta ?? '—',
        solicitudes: 0,
        proyectos: 0,
      };
      c.solicitudes++;
      if (s.planteamiento?.proyecto) c.proyectos++;
      carreras.set(k, c);
    }
    const porCarrera = [...carreras.values()].sort(
      (a, b) => b.solicitudes - a.solicitudes || b.proyectos - a.proyectos,
    );

    // ── Por comuna ───────────────────────────────────────────────────────────
    const comunas = new Map<string, number>();
    for (const s of solicitudes) {
      const k = s.ciudad?.trim() || 'Sin comuna';
      comunas.set(k, (comunas.get(k) ?? 0) + 1);
    }
    const porComuna = [...comunas.entries()]
      .map(([comuna, solicitudes]) => ({ comuna, solicitudes }))
      .sort((a, b) => b.solicitudes - a.solicitudes)
      .slice(0, 10);

    // ── Ranking de docentes ──────────────────────────────────────────────────
    const docentes = new Map<
      number,
      { docente: string; planteamientos: number; aprobados: number; proyectos: number; horasHombre: number }
    >();
    for (const p of planteamientos) {
      const d = docentes.get(p.docenteId) ?? {
        docente: `${p.docente.nombres} ${p.docente.apellidos}`,
        planteamientos: 0,
        aprobados: 0,
        proyectos: 0,
        horasHombre: 0,
      };
      d.planteamientos++;
      if (p.estado === 'APROBADO') d.aprobados++;
      if (p.proyecto) {
        d.proyectos++;
        d.horasHombre += p.horasHombre ?? 0;
      }
      docentes.set(p.docenteId, d);
    }
    const rankingDocentes = [...docentes.values()]
      .sort((a, b) => b.proyectos - a.proyectos || b.planteamientos - a.planteamientos)
      .slice(0, 10);

    // ── Ranking de alumnos voluntarios ───────────────────────────────────────
    const alumnos = new Map<number, { alumno: string; proyectos: number }>();
    for (const pr of proyectos) {
      for (const a of pr.alumnos) {
        const x = alumnos.get(a.alumnoId) ?? {
          alumno: `${a.alumno.nombres} ${a.alumno.apellidos}`,
          proyectos: 0,
        };
        x.proyectos++;
        alumnos.set(a.alumnoId, x);
      }
    }
    const rankingAlumnos = [...alumnos.values()].sort((a, b) => b.proyectos - a.proyectos).slice(0, 10);

    const totalSol = solicitudes.length;
    const data = {
      resumen: {
        solicitudes: {
          total: totalSol,
          pendientes: solPorEstado.PENDIENTE,
          aprobadas: solPorEstado.APROBADA,
          rechazadas: solPorEstado.RECHAZADA,
          pctAprobadas: pct(solPorEstado.APROBADA, totalSol),
          pctRechazadas: pct(solPorEstado.RECHAZADA, totalSol),
          pctPendientes: pct(solPorEstado.PENDIENTE, totalSol),
        },
        planteamientos: { total: planteamientos.length, ...plantPorEstado },
        proyectos: {
          total: proyectos.length,
          enProceso: proyPorEstado.EN_PROCESO,
          pausados: proyPorEstado.PAUSADO,
          finalizados: proyPorEstado.FINALIZADO,
          cancelados: proyPorEstado.CANCELADO,
          pctFinalizados: pct(proyPorEstado.FINALIZADO, proyectos.length),
        },
        tasaConversion: pct(proyectos.length, totalSol),
        horasHombre,
        participantes: { ...participantes, total: participantes.docentes + participantes.estudiantes + participantes.docentesExternos + participantes.alumnosExternos + participantes.otrosExternos },
        alumnosVoluntarios: alumnosSet.size,
        duracionPromedioDias: proyectos.length ? round1(sumaDuracionMs / proyectos.length / DIA_MS) : null,
        tiempoRespuestaPromedioDias: respondidas ? round1(sumaRespuestaMs / respondidas / DIA_MS) : null,
      },
      porMes,
      porFacultad,
      porTipoIntervencion,
      porCarrera,
      porComuna,
      rankingDocentes,
      rankingAlumnos,
    };

    return { data, message: 'Dashboard obtenido exitosamente', statusCode: 200 };
  }
}
