import type { UserRole } from "@prisma/client";

import { countPendingRecommendationsMatchingReport } from "@/lib/data/recommendations-pending-count";

/**
 * العد: نفس ‎/reports/recommendations?filter=pending‎ مع نطاق ‎2010-01-01‬ → اليوم
 * (و‎targetUserId / assignedUserId‎ حسب الدور والفلتر كما في صفحة التقرير).
 */
export async function getDashboardData(params: {
  userRole: UserRole;
  dbUserId: string;
  salesKey: string;
}) {
  const pendingActionRecommendationsCount =
    await countPendingRecommendationsMatchingReport({
      userRole: params.userRole,
      dbUserId: params.dbUserId,
      salesKey: params.salesKey,
    });

  return { pendingActionRecommendationsCount };
}
