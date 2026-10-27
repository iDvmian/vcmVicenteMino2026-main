import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Alcance del Decano: solo ve la información de su propia facultad.
 * Devuelve el id de esa facultad; -1 si el decano no tiene facultad asignada (no ve nada);
 * y null si el usuario no es Decano (esta regla no le aplica).
 */
export async function facultadDelDecano(
  prisma: PrismaService,
  user: { id: number; rol: string },
): Promise<number | null> {
  if (user.rol !== Role.DECANO) return null;
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { facultadId: true } });
  return u?.facultadId ?? -1;
}
