import type { Prisma, UserRole } from "@prisma/client";
import { ClientStatus } from "@prisma/client";

import { MAX_CLIENT_ROWS_FOR_UI } from "@/lib/constants/client-query-limits";
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
    take: MAX_CLIENT_ROWS_FOR_UI,
    orderBy,
  };

  /** `clientReportExportSelect` يستبعد ‎customFields‎ والحقول الثقيلة غير المستخدمة في ‎ReportBRow‎. */
  return prisma.client.findMany({
    ...base,
    select: clientReportExportSelect,
  });
}
