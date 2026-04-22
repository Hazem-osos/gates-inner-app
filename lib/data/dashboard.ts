import { prisma } from "@/lib/prisma";
import { todayInputDate } from "@/lib/date-arabic";
import {
  managementRecommendationDateWindowWhere,
  RECOMMENDATIONS_WIDE_RANGE_START_YMD,
  ymdRangeToBounds,
} from "@/lib/recommendations-report-search";

/**
 * توصيات موجّهة للمندوب (targetUserId) بلا «إجراء متخذ» في نفس نطاق التواريخ
 * المستخدم في تقرير «لم يتخذ إجراء».
 */
export async function countPendingActionRecommendationsForUser(
  userId: string
): Promise<number> {
  const toYmd = todayInputDate();
  const { rangeStart, rangeEnd } = ymdRangeToBounds(
    RECOMMENDATIONS_WIDE_RANGE_START_YMD,
    toYmd
  );

  return prisma.managementRecommendation.count({
    where: {
      AND: [
        { targetUserId: userId },
        managementRecommendationDateWindowWhere(rangeStart, rangeEnd),
        {
          OR: [{ actionTaken: null }, { actionTaken: "" }],
        },
      ],
    },
  });
}

export async function getDashboardData(userId: string) {
  const pendingActionRecommendationsCount =
    await countPendingActionRecommendationsForUser(userId);

  return { pendingActionRecommendationsCount };
}
