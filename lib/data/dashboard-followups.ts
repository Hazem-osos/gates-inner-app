import type { UserRole } from "@prisma/client";
import { ClientStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/report-scope";

export async function listClientsForDashboardFollowups(
  role: UserRole,
  userId: string
) {
  const scope = clientScopeWhere({ role, userId, salesUserId: undefined });
  return prisma.client.findMany({
    where: {
      ...scope,
      status: { in: [ClientStatus.B, ClientStatus.NOT_B] },
      nextFollowUpAt: { not: null },
    },
    include: {
      assignedUser: { select: { id: true, name: true } },
      classification: {
        select: { id: true, label: true, color: true, isBRow: true },
      },
    },
    take: 1000,
    orderBy: { nextFollowUpAt: "asc" },
  });
}
