import { Suspense } from "react";

import { DeferredReportBTable } from "@/components/reports/deferred-report-b-table";
import { DashboardFollowupSingleTableSkeleton } from "@/components/skeletons/crm-skeletons";
import type { SessionUser } from "@/lib/auth-helpers";
import {
  loadDashboardOverdueRows,
  loadDashboardTodayRows,
} from "@/lib/data/dashboard-followup-board";
import { listClientClassifications } from "@/lib/data/classifications";
import { resolveActiveSalesName } from "@/lib/resolve-active-sales-name";
import { cn } from "@/lib/utils";

import type { DashboardFollowupDedicatedVariant } from "./dashboard-followup-dedicated-view";
import { DASHBOARD_FOLLOWUP_COPY } from "./dashboard-followup-dedicated-view";

export async function DashboardFollowupDedicatedTable({
  variant,
  user,
  workLogUserId,
  salesKey,
}: {
  variant: DashboardFollowupDedicatedVariant;
  user: SessionUser;
  workLogUserId: string;
  salesKey: string;
}) {
  const copy = DASHBOARD_FOLLOWUP_COPY[variant];
  const pathname =
    variant === "today"
      ? "/dashboard/followups-today"
      : "/dashboard/followups-overdue";

  const [rows, classifications, activeSalesName] = await Promise.all([
    variant === "today"
      ? loadDashboardTodayRows(user.role, user.id, salesKey)
      : loadDashboardOverdueRows(user.role, user.id, salesKey),
    listClientClassifications(),
    resolveActiveSalesName(user.role, salesKey),
  ]);

  return (
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
          <DeferredReportBTable
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
  );
}

export function DashboardFollowupDedicatedTableSuspense(
  props: {
    variant: DashboardFollowupDedicatedVariant;
    user: SessionUser;
    workLogUserId: string;
    salesKey: string;
  }
) {
  return (
    <Suspense fallback={<DashboardFollowupSingleTableSkeleton />}>
      <DashboardFollowupDedicatedTable {...props} />
    </Suspense>
  );
}
