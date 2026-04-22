import type { Prisma, UserRole } from "@prisma/client";
import { ClientStatus } from "@prisma/client";

import { clientReportExportSelect } from "@/lib/data/report-queries";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/report-scope";

/**
 * عملاء B و Not B في نطاق المستخدم — **بدون `take`** حتى تطابق لوحة «متابعات متأخرة»
 * كل المهمولين/المتأخرين حسب `passesNeglected` في التطبيق (لا يُقطع بسقف).
 */
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

  const where: Prisma.ClientWhereInput = {
    ...scope,
    status: { in: [ClientStatus.B, ClientStatus.NOT_B] as ClientStatus[] },
  };

  return prisma.client.findMany({
    where,
    orderBy,
    select: clientReportExportSelect,
  });
}
