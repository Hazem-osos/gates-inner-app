import type { UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { MAX_CLIENT_ROWS_FOR_UI } from "@/lib/constants/client-query-limits";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/report-scope";

/** فلتر القائمة: نطاق السيلز + بحث اختياري بالاسم أو الشركة أو الهاتف. */
export function buildClientsListWhere(
  role: UserRole,
  userId: string,
  salesUserId?: string | null,
  q?: string | null
): Prisma.ClientWhereInput {
  const base = clientScopeWhere({ role, userId, salesUserId });
  const t = q?.trim();
  if (!t) return base;
  return {
    ...base,
    OR: [
      { name: { contains: t } },
      { company: { contains: t } },
      { phone: { contains: t } },
      { phone2: { contains: t } },
    ],
  };
}

export async function listClientsForUser(
  role: UserRole,
  userId: string,
  salesUserId?: string | null,
  q?: string | null
) {
  const where = buildClientsListWhere(role, userId, salesUserId, q);

  return prisma.client.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      company: true,
      phone: true,
      status: true,
      nextFollowUpAt: true,
      initialCallDate: true,
      assignedUser: { select: { name: true, deletedAt: true } },
    },
    take: MAX_CLIENT_ROWS_FOR_UI,
  });
}
