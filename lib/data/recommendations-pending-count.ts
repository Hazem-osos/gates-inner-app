import type { Prisma, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { todayInputDate } from "@/lib/date-arabic";
import {
  clientPendingRecommendationDateWindowWhere,
  managementRecommendationDateWindowWhere,
  RECOMMENDATIONS_WIDE_RANGE_START_YMD,
  ymdRangeToBounds,
} from "@/lib/recommendations-report-search";

/**
 * نفس منطق صفحة ‎/reports/recommendations‎ مع ‎filter=pending‎ ونطاق
 * ‎from=RECOMMENDATIONS_WIDE_RANGE_START_YMD .. to=اليوم‎ (بلا ‎fullDb‎):
 * صفوف ‎ManagementRecommendation‎ بـ ‎actionTaken‎ فارغ/مسافات + صفوف «نص على Client فقط» غير المكرّرة.
 */
export async function countPendingRecommendationsMatchingReport(options: {
  userRole: UserRole;
  /** مطابق ‎resolveSessionDbUserId ?? session.id‎ في صفحة التقرير */
  dbUserId: string;
  salesKey: string;
}): Promise<number> {
  const toYmd = todayInputDate();
  const { rangeStart, rangeEnd } = ymdRangeToBounds(
    RECOMMENDATIONS_WIDE_RANGE_START_YMD,
    toYmd
  );

  const { userRole, dbUserId, salesKey } = options;

  const recommendationWhereBase: Prisma.ManagementRecommendationWhereInput =
    userRole === "SALES"
      ? { targetUserId: dbUserId }
      : salesKey !== "all"
        ? { targetUserId: salesKey }
        : {};

  const recommendationWhere: Prisma.ManagementRecommendationWhereInput = {
    AND: [
      recommendationWhereBase,
      managementRecommendationDateWindowWhere(rangeStart, rangeEnd),
    ],
  };

  const allRecRows = await prisma.managementRecommendation.findMany({
    where: recommendationWhere,
    select: { clientId: true, body: true, actionTaken: true },
  });

  const recKeysForDedupe = new Set(
    allRecRows.map((r) => `${r.clientId}\0${r.body.trim()}`)
  );

  const fromRecPending = allRecRows.filter(
    (r) => !(r.actionTaken ?? "").trim()
  ).length;

  const clientWhereBase: Prisma.ClientWhereInput = {
    managementRecommendationText: { not: null },
    ...(userRole === "SALES"
      ? { assignedUserId: dbUserId }
      : salesKey !== "all"
        ? { assignedUserId: salesKey }
        : {}),
  };

  const clientWhere: Prisma.ClientWhereInput = {
    AND: [
      clientWhereBase,
      clientPendingRecommendationDateWindowWhere(rangeStart, rangeEnd),
    ],
  };

  const clientsWithReportText = await prisma.client.findMany({
    where: clientWhere,
    select: { id: true, managementRecommendationText: true },
  });

  let clientOnlyCount = 0;
  for (const c of clientsWithReportText) {
    const t = (c.managementRecommendationText ?? "").trim();
    if (!t) continue;
    const key = `${c.id}\0${t}`;
    if (recKeysForDedupe.has(key)) continue;
    clientOnlyCount += 1;
  }

  return fromRecPending + clientOnlyCount;
}
