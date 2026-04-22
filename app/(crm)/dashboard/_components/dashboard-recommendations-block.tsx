import Link from "next/link";

import { SalesFilterActiveMessage } from "@/components/reports/sales-filter-records-status";
import { resolveActiveSalesName } from "@/lib/resolve-active-sales-name";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardData } from "@/lib/data/dashboard";
import type { SessionUser } from "@/lib/auth-helpers";
import { todayInputDate } from "@/lib/date-arabic";
import {
  buildRecommendationsReportHref,
  RECOMMENDATIONS_WIDE_RANGE_START_YMD,
} from "@/lib/recommendations-report-search";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function DashboardRecommendationsBlock({
  user,
  dbUserId,
  salesKey,
}: {
  user: SessionUser;
  dbUserId: string;
  salesKey: string;
}) {
  const [{ pendingActionRecommendationsCount }, activeSalesName] =
    await Promise.all([
      getDashboardData({ userRole: user.role, dbUserId, salesKey }),
      resolveActiveSalesName(user.role, salesKey),
    ]);

  const todayYmd = todayInputDate();
  const recommendationsPendingHref = buildRecommendationsReportHref({
    filter: "pending",
    fromYmd: RECOMMENDATIONS_WIDE_RANGE_START_YMD,
    toYmd: todayYmd,
    ...(user.role !== "SALES" && salesKey !== "all"
      ? { sales: salesKey }
      : {}),
  });

  const isSalesRepScopedView = user.role === "SALES";
  const isTeamWideAdminView = user.role !== "SALES" && salesKey === "all";
  const isFilteredRepDashboard = user.role !== "SALES" && salesKey !== "all";

  return (
    <>
      {user.role !== "SALES" && activeSalesName ? (
        <div className="w-full">
          <SalesFilterActiveMessage activeSalesName={activeSalesName} />
        </div>
      ) : null}

      <Card className="border-amber-200/80 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle>توصيات إدارة — لم يُتخذ إجراء</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-foreground">
          {isSalesRepScopedView || isTeamWideAdminView ? (
            <p className="text-muted-foreground" dir="rtl">
              يُحصى فقط ما هو{" "}
              <span className="font-medium text-foreground">موجّه لك</span> (كمسند
              تابع للتوصية) ولا يزال حقل «الإجراء المتخذ» فارغاً، من بداية
              تسجيل التوصيات حتى{" "}
              <span className="font-medium text-foreground">{todayYmd}</span>.
              {isSalesRepScopedView
                ? " مندوبو المبيعات يرون طلباتهم فقط؛ الإدارة ترى التقرير حسب فلتر السيلز داخل صفحة التوصيات."
                : " عند اختيار مندوب من فلتر السيلز في هذه الصفحة يُعاد العد لذلك المندوب."}
            </p>
          ) : (
            <p className="text-muted-foreground" dir="rtl">
              يُحصى فقط ما هو{" "}
              <span className="font-medium text-foreground">
                موجّه للمندوب المحدد
              </span>{" "}
              في فلتر السيلز أعلاه (كمسند تابع للتوصية) ولا يزال حقل «الإجراء
              المتخذ» فارغاً، من بداية تسجيل التوصيات حتى{" "}
              <span className="font-medium text-foreground">{todayYmd}</span>.
              يفتح رابط التقرير بنفس فلتر السيلز.
            </p>
          )}
          <p
            className="text-lg font-semibold tabular-nums text-amber-900 dark:text-amber-100"
            dir="rtl"
          >
            {pendingActionRecommendationsCount === 0
              ? isFilteredRepDashboard
                ? "لا توجد لهذا المندوب توصيات بلا إجراء في هذا النطاق."
                : "لا توجد لديك توصيات بلا إجراء في هذا النطاق."
              : `يوجد ${pendingActionRecommendationsCount} توصية لم يُتخذ بشأنها إجراء حتى تاريخه.`}
          </p>
          <Link
            href={recommendationsPendingHref}
            className={cn(buttonVariants({ variant: "default" }))}
          >
            عرض التوصيات في التقرير
          </Link>
        </CardContent>
      </Card>
    </>
  );
}
