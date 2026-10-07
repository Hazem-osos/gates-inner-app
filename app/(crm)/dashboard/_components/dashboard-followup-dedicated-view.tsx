import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { REPORT_FILTER_EXPORTS_BAR_CLASS } from "@/components/reports/report-page-exports-toolbar";
import {
  ReportBTable,
  type ReportBRow,
} from "@/components/reports/report-b-table";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import type { SessionUser } from "@/lib/auth-helpers";
import type { ClassificationRow } from "@/lib/data/classifications";
import { dashboardFollowupsExportHref } from "@/lib/export-excel-href";
import { resolveActiveSalesName } from "@/lib/resolve-active-sales-name";
import { cn } from "@/lib/utils";

export type DashboardFollowupDedicatedVariant = "today" | "overdue";

const COPY: Record<
  DashboardFollowupDedicatedVariant,
  {
    title: string;
    subtitleSales: string;
    subtitleTeam: string;
    subtitleOneSales: string;
    empty: string;
    auditReportKey: string;
    headerClass: string;
    badgeClass: string;
  }
> = {
  today: {
    title: "متابعات اليوم",
    subtitleSales:
      "عملاء B و Not B الذين تاريخ «متابعة تالية» لهم اليوم (تقويم محلي).",
    subtitleTeam: "متابعات اليوم لكل السيلز — أو حسب فلتر المندوب أعلاه.",
    subtitleOneSales: "متابعات اليوم للمندوب المحدد في فلتر السيلز.",
    empty: "لا توجد متابعات مجدولة اليوم.",
    auditReportKey: "report-dashboard-followups-today",
    headerClass:
      "border-emerald-200/70 bg-emerald-50/95 text-emerald-950 supports-[backdrop-filter]:bg-emerald-50/90",
    badgeClass:
      "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
  },
  overdue: {
    title: "متابعات متأخرة",
    subtitleSales:
      "عمود «متابعة تالية» فارغ، غير صالح، أو قبل اليوم (تقويم محلي).",
    subtitleTeam:
      "المتابعات المتأخرة والمهمولة لكل السيلز — أو حسب فلتر المندوب أعلاه.",
    subtitleOneSales: "المتابعات المتأخرة للمندوب المحدد في فلتر السيلز.",
    empty: "لا يوجد تأخير.",
    auditReportKey: "report-dashboard-followups-overdue",
    headerClass:
      "border-rose-200/70 bg-rose-50/95 text-rose-950 supports-[backdrop-filter]:bg-rose-50/90",
    badgeClass: "bg-rose-100 text-rose-900 ring-rose-200/80",
  },
};

export async function DashboardFollowupDedicatedView({
  variant,
  user,
  workLogUserId,
  salesKey,
  rows,
  classifications,
}: {
  variant: DashboardFollowupDedicatedVariant;
  user: SessionUser;
  workLogUserId: string;
  salesKey: string;
  rows: ReportBRow[];
  classifications: ClassificationRow[];
}) {
  const copy = COPY[variant];
  const pathname =
    variant === "today"
      ? "/dashboard/followups-today"
      : "/dashboard/followups-overdue";

  const activeSalesName = await resolveActiveSalesName(user.role, salesKey);

  const subtitle =
    user.role === "SALES"
      ? `مرحباً ${user.name} — ${copy.subtitleSales}`
      : salesKey === "all"
        ? `مرحباً ${user.name} — ${copy.subtitleTeam}`
        : `مرحباً ${user.name} — ${copy.subtitleOneSales}`;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader fullWidthBar title={copy.title} subtitle={subtitle.trim()} />

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
              pathname={pathname}
              searchParams={{}}
              currentSales={salesKey}
            />
          </div>
        ) : null}
      </div>

      <section className="space-y-2">
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-t-xl border border-b-0 px-4 py-4 shadow-sm backdrop-blur-sm",
            copy.headerClass
          )}
        >
          <h2 className="text-xl font-semibold md:text-2xl">{copy.title}</h2>
          {rows.length > 0 ? (
            <span
              className={cn(
                "rounded-full px-3.5 py-1 text-xl font-bold tabular-nums ring-1",
                copy.badgeClass
              )}
            >
              {rows.length}
            </span>
          ) : null}
        </div>
        <div className="rounded-b-xl border border-t-0 border-border/80 bg-background p-2 shadow-sm">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {copy.empty}
            </p>
          ) : (
            <ReportBTable
              rows={rows}
              classifications={classifications}
              auditReportKey={copy.auditReportKey}
              toolbar="full"
              workLogUserId={workLogUserId}
              workLogUserRole={user.role}
              activeSalesName={activeSalesName}
              showViolationPanel={true}
              showSortAndVisitToolbar={true}
              clearPageFiltersHref={
                salesKey !== "all"
                  ? `${pathname}?sales=${encodeURIComponent(salesKey)}`
                  : pathname
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
