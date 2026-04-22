import type { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getDashboardData(role: UserRole, userId: string) {
  const unreadAlerts = await prisma.alert.findMany({
    where: { userId, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { client: { select: { id: true, name: true, company: true } } },
  });

  const openRecs = await prisma.managementRecommendation.findMany({
    where: {
      targetUserId: userId,
      acknowledgedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      client: { select: { id: true, name: true, company: true } },
      author: { select: { name: true } },
    },
  });

  return { unreadAlerts, openRecs };
}
