import { prisma } from "@/lib/prisma";
import { todayInputDate } from "@/lib/date-arabic";
import {
  RECOMMENDATIONS_WIDE_RANGE_START_YMD,
  ymdRangeToBounds,
} from "@/lib/recommendations-report-search";

/**
 * توصيات موجّهة للمندوب (targetUserId) بلا «إجراء متخذ» فعلياً
 * (نفس منطق تقرير «لم يتخذ إجراء»: null أو فقط فراغ/مسافات في actionTaken)
 * وفي نطاق تاريخ التوصية/الإنشاء كاللوحة.
 */
export async function countPendingActionRecommendationsForUser(
  userId: string
): Promise<number> {
  const toYmd = todayInputDate();
  const { rangeStart, rangeEnd } = ymdRangeToBounds(
    RECOMMENDATIONS_WIDE_RANGE_START_YMD,
    toYmd
  );

  const [row] = await prisma.$queryRaw<[{ c: bigint }]>`
    SELECT COUNT(*) AS c
    FROM \`ManagementRecommendation\`
    WHERE \`targetUserId\` = ${userId}
      AND (actionTaken IS NULL OR TRIM(actionTaken) = '')
      AND (
        (recommendationDate IS NOT NULL
          AND recommendationDate >= ${rangeStart}
          AND recommendationDate <= ${rangeEnd}
        )
        OR
        (recommendationDate IS NULL
          AND createdAt >= ${rangeStart}
          AND createdAt <= ${rangeEnd}
        )
      )
  `;
  return row ? Number(row.c) : 0;
}

export async function getDashboardData(userId: string) {
  const pendingActionRecommendationsCount =
    await countPendingActionRecommendationsForUser(userId);

  return { pendingActionRecommendationsCount };
}
