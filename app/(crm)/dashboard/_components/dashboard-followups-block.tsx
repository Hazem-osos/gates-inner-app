import { ReportBTable } from "@/components/reports/report-b-table";
import { listClientClassifications } from "@/lib/data/classifications";
import { listClientsForDashboardFollowups } from "@/lib/data/dashboard-followups";
import { clientEntityToReportBRow } from "@/lib/mappers/client-to-report-b-row";
import { passesNeglected } from "@/lib/report-b-utils";
import type { SessionUser } from "@/lib/auth-helpers";
import { endOfDay, isWithinInterval, startOfDay } from "date-fns";

export async function DashboardFollowupBlocks({
  user,
  salesKey,
}: {
  user: SessionUser;
  salesKey: string;
}) {
  const [followupClients, classifications] = await Promise.all([
    listClientsForDashboardFollowups(user.role, user.id, {
      salesUserId: salesKey,
    }),
    listClientClassifications(),
  ]);

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

  return (
    <>
      <section
        id="dashboard-today-followups"
        className="scroll-mt-24 space-y-2"
      >
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
              auditReportKey="report-dashboard-followups"
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
              auditReportKey="report-dashboard-followups"
              toolbar="dashboard"
            />
          )}
        </div>
      </section>
    </>
  );
}
