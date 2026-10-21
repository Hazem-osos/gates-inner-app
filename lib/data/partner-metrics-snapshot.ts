import { ClientStatus, UserRole } from "@prisma/client";

import {
  loadDashboardOverdueRows,
  loadDashboardTodayRows,
} from "@/lib/data/dashboard-followup-board";
import { countPendingRecommendationsMatchingReport } from "@/lib/data/recommendations-pending-count";
import { prisma } from "@/lib/prisma";
import { todayInputDate } from "@/lib/date-arabic";

/**
 * لقطة أرقام قراءة فقط — نفس منطق لوحة المتابعات (فريق كامل، بدون فلتر سيلز).
 * للوصول عبر HTTPS من شركاء خارجيين (بدون MySQL مباشر).
 */
export async function buildPartnerMetricsSnapshot() {
  const role = UserRole.ADMIN;
  const scopeUserId = "";
  const salesKey = "all";

  const [
    statusGroups,
    activeUsers,
    todayRows,
    overdueRows,
    pendingActionRecommendationsCount,
  ] = await Promise.all([
    prisma.client.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.user.count({
      where: { deletedAt: null, isActive: true },
    }),
    loadDashboardTodayRows(role, scopeUserId, salesKey),
    loadDashboardOverdueRows(role, scopeUserId, salesKey),
    countPendingRecommendationsMatchingReport({
      userRole: role,
      dbUserId: scopeUserId,
      salesKey,
    }),
  ]);

  const clientsByStatus: Record<string, number> = {};
  for (const g of statusGroups) {
    clientsByStatus[g.status] = g._count._all;
  }

  const b = clientsByStatus[ClientStatus.B] ?? 0;
  const notB = clientsByStatus[ClientStatus.NOT_B] ?? 0;

  return {
    kind: "crm_partner_metrics_snapshot",
    generatedAt: new Date().toISOString(),
    calendarDateLocal: todayInputDate(),
    note:
      "متابعات اليوم/المتأخرة بنفس تعريف لوحة الإرشادية (عمود «متابعة تالية»؛ المتأخرة = مهمول passesNeglected).",
    clients: {
      byStatus: clientsByStatus,
      activePipelineBPlusNotB: b + notB,
    },
    followUps: {
      todayCount: todayRows.length,
      overdueNeglectedCount: overdueRows.length,
    },
    recommendations: {
      pendingActionCount: pendingActionRecommendationsCount,
    },
    users: {
      activeCount: activeUsers,
    },
  };
}
