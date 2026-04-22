import type { Prisma, UserRole } from "@prisma/client";
import { ClientStatus } from "@prisma/client";

import { clientReportExportSelect } from "@/lib/data/report-queries";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/report-scope";

export async function listClientsForDashboardFollowups(
  role: UserRole,
  userId: string,
  opts?: { forExport?: boolean; salesUserId?: string }
) {
  const scope = clientScopeWhere({
    role,
    userId,
    salesUserId: opts?.salesUserId,
  });
  const orderBy: Prisma.ClientOrderByWithRelationInput[] = [
    { nextFollowUpAt: "asc" },
    { id: "asc" },
  ];

  const base = {
    where: {
      ...scope,
      status: { in: [ClientStatus.B, ClientStatus.NOT_B] as ClientStatus[] },
      nextFollowUpAt: { not: null },
    },
    take: 1000,
    orderBy,
  };

  if (opts?.forExport) {
    return prisma.client.findMany({
      ...base,
      select: clientReportExportSelect,
    });
  }

  return prisma.client.findMany({
    ...base,
    include: {
      assignedUser: { select: { id: true, name: true, deletedAt: true } },
      classification: {
        select: { id: true, label: true, color: true, isBRow: true },
      },
    },
  });
}
