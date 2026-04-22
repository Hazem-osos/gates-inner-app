import Link from "next/link";

import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { REPORT_FILTER_EXPORTS_BAR_CLASS } from "@/components/reports/report-page-exports-toolbar";
import { ReportBTable } from "@/components/reports/report-b-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listClientClassifications } from "@/lib/data/classifications";
import { listClientsForDashboardFollowups } from "@/lib/data/dashboard-followups";
import { getDashboardData } from "@/lib/data/dashboard";
import { clientEntityToReportBRow } from "@/lib/mappers/client-to-report-b-row";
import { dashboardFollowupsExportHref } from "@/lib/export-excel-href";
import { passesNeglected } from "@/lib/report-b-utils";
import { cn } from "@/lib/utils";
import { todayInputDate } from "@/lib/date-arabic";
import {
  buildRecommendationsReportHref,
  RECOMMENDATIONS_WIDE_RANGE_START_YMD,
} from "@/lib/recommendations-report-search";
import { buttonVariants } from "@/components/ui/button";
import { requireSessionUser } from "@/lib/auth-helpers";
import { endOfDay, isWithinInterval, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sales?: string }>;
}) {
  const user = await requireSessionUser();
  const sp = await searchParams;
  const salesKey = sp.sales?.trim() ?? "all";
  const recCountUserId =
    user.role === "SALES" || salesKey === "all" ? user.id : salesKey;

  const [
    { pendingActionRecommendationsCount },
    followupClients,
    classifications,
  ] = await Promise.all([
    getDashboardData(recCountUserId),
    listClientsForDashboardFollowups(user.role, user.id, {
      salesUserId: salesKey,
    }),
    listClientClassifications(),
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
  const isFilteredRepDashboard =
    user.role !== "SALES" && salesKey !== "all";

  const rowsAll = followupClients.map(clientEntityToReportBRow);
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const todayRows = rowsAll.filter((r) => {
    if (!r.nextFollowUpAt) return false;
    const d = new Date(r.nextFollowUpAt);
    return isWithinInterval(d, { start: todayStart, end: todayEnd });
  });

  const overdueRows = rowsAll.filter((r) => passesNeglected(r));

  const reportBTableSharedProps = {
    classifications,
  } as const;

  const headerSubtitle =
    user.role === "SALES"
      ? `مرحباً ${user.name} — متابعاتك اليومية.`
      : salesKey === "all"
        ? `مرحباً ${user.name} — متابعات الفريق (كل السيلز).`
        : `مرحباً ${user.name} — متابعات المندوب المحدد في فلتر السيلز.`;

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="لوحة إرشادية بالمتابعات اليومية"
        subtitle={headerSubtitle}
      />

      <div
        className={cn(
          REPORT_FILTER_EXPORTS_BAR_CLASS,
          user.role === "SALES" ? "justify-start" : "justify-between"
        )}
        dir="rtl"
      >
        <ExportToolbar
          excelHref={dashboardFollowupsExportHref({ sales: salesKey })}
        />
        {user.role !== "SALES" ? (
          <div className="flex min-w-0 max-w-full flex-col items-end gap-1 self-center">
            <SalesFilterLinks
              bare
              role={user.role}
              pathname="/dashboard"
              searchParams={{}}
              currentSales={salesKey}
            />
            {salesKey !== "all" ? (
              <p className="max-w-sm text-right text-xs font-medium text-destructive">
                يوجد فلتر نشط على النتائج المعروضة.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <Card className="border-amber-200/80 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle>توصيات إدارة — لم يُتخذ إجراء</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-foreground">
          {isSalesRepScopedView || isTeamWideAdminView ? (
            <p className="text-muted-foreground" dir="rtl">
              يُحصى فقط ما هو <span className="font-medium text-foreground">موجّه لك</span>{" "}
              (كمسند تابع للتوصية) ولا يزال حقل «الإجراء المتخذ» فارغاً، من بداية تسجيل
              التوصيات حتى <span className="font-medium text-foreground">{todayYmd}</span>.
              {isSalesRepScopedView
                ? " مندوبو المبيعات يرون طلباتهم فقط؛ الإدارة ترى التقرير حسب فلتر السيلز داخل صفحة التوصيات."
                : " عند اختيار مندوب من فلتر السيلز في هذه الصفحة يُعاد العد لذلك المندوب."}
            </p>
          ) : (
            <p className="text-muted-foreground" dir="rtl">
              يُحصى فقط ما هو <span className="font-medium text-foreground">موجّه للمندوب المحدد</span>{" "}
              في فلتر السيلز أعلاه (كمسند تابع للتوصية) ولا يزال حقل «الإجراء المتخذ» فارغاً، من بداية
              تسجيل التوصيات حتى{" "}
              <span className="font-medium text-foreground">{todayYmd}</span>. يفتح رابط التقرير
              بنفس فلتر السيلز.
            </p>
          )}
          <p className="text-lg font-semibold tabular-nums text-amber-900 dark:text-amber-100" dir="rtl">
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

      <section id="dashboard-today-followups" className="scroll-mt-24 space-y-2">
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-3 rounded-t-xl border border-b-0 border-emerald-200/70 bg-emerald-50/95 px-4 py-3.5 text-emerald-950 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-emerald-50/90">
          <h2 className="text-lg font-semibold md:text-xl">متابعات اليوم</h2>
          {todayRows.length > 0 ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-lg font-bold tabular-nums text-emerald-900 ring-1 ring-emerald-200/80">
              {todayRows.length}
            </span>
          ) : null}
        </div>
        <div className="rounded-b-xl border border-t-0 border-border/80 bg-background p-2">
          {todayRows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              لا توجد متابعات مجدولة اليوم.
            </p>
          ) : (
            <ReportBTable
              rows={todayRows}
              {...reportBTableSharedProps}
              auditReportKey="report-b"
              toolbar="dashboard"
            />
          )}
        </div>
      </section>

      <section className="space-y-2">
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-3 rounded-t-xl border border-b-0 border-rose-200/70 bg-rose-50/95 px-4 py-3.5 text-rose-950 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-rose-50/90">
          <h2 className="text-lg font-semibold md:text-xl">متابعات متأخرة</h2>
          {overdueRows.length > 0 ? (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-lg font-bold tabular-nums text-rose-900 ring-1 ring-rose-200/80">
              {overdueRows.length}
            </span>
          ) : null}
        </div>
        <div className="rounded-b-xl border border-t-0 border-border/80 bg-background p-2">
          {overdueRows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">لا يوجد تأخير.</p>
          ) : (
            <ReportBTable
              rows={overdueRows}
              {...reportBTableSharedProps}
              auditReportKey="report-b"
              toolbar="dashboard"
            />
          )}
        </div>
      </section>
    </div>
  );
}
