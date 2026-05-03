import type { Prisma, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function listSalesUsersForTransferReportFilters() {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      role: "SALES",
    },
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }],
  });
}

/** فلترة تقرير النقل — للسيلز: غير المُقرّ باطلاعهم فقط وإليك فقط. للأدمن/المدير: الكل أو حسب الفلاتر. */
export function transferredReportWhere(
  role: UserRole,
  viewerDbUserId: string,
  fromSalesId: string,
  toSalesId: string
): Prisma.ClientTransferWhereInput {
  const isManagerPlus = role === "ADMIN" || role === "MANAGER";
  if (!isManagerPlus) {
    return {
      toUserId: viewerDbUserId,
      acknowledgedAt: null,
    };
  }
  const parts: Prisma.ClientTransferWhereInput[] = [];
  if (fromSalesId && fromSalesId !== "all") {
    parts.push({ fromUserId: fromSalesId });
  }
  if (toSalesId && toSalesId !== "all") {
    parts.push({ toUserId: toSalesId });
  }
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0]!;
  return { AND: parts };
}
