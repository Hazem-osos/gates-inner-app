import Link from "next/link";

import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { MarkAlertButton } from "@/components/dashboard/mark-alert-button";
import { ReportBTable } from "@/components/reports/report-b-table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listClientClassifications } from "@/lib/data/classifications";
import { listClientsForDashboardFollowups } from "@/lib/data/dashboard-followups";
import { getDashboardData } from "@/lib/data/dashboard";
import { listReportRowStylesForClients } from "@/lib/data/report-row-styles";
import { clientEntityToReportBRow } from "@/lib/mappers/client-to-report-b-row";
import { dashboardFollowupsExportHref } from "@/lib/export-excel-href";
import { passesNeglected } from "@/lib/report-b-utils";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { endOfDay, isWithinInterval, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireSessionUser();

  const [
    { unreadAlerts, openRecs },
    followupClients,
    classifications,
  ] = await Promise.all([
    getDashboardData(user.role, user.id),
    listClientsForDashboardFollowups(user.role, user.id),
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

  const clientIds = [
    ...new Set([...todayRows, ...overdueRows].map((r) => r.id)),
  ];

  const reportRowStyleUserId =
    (await resolveSessionDbUserId(user)) ?? user.id;

  const rowStyles = await listReportRowStylesForClients({
    userId: reportRowStyleUserId,
    reportKey: "report-b",
    clientIds,
  });

  const reportBTableSharedProps = {
    classifications,
    rowStyles,
    currentUserId: reportRowStyleUserId,
  } as const;

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="لوحة إرشادية بالمتابعات اليومية"
        subtitle={`مرحباً ${user.name} — متابعاتك وتنبيهاتك.`}
      />

      <ExportToolbar
        importKind="dashboard-followups"
        excelHref={dashboardFollowupsExportHref()}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            تنبيهات غير مقروءة
            {unreadAlerts.length > 0 ? (
              <Badge variant="destructive">{unreadAlerts.length}</Badge>
            ) : null}
          </CardTitle>
          <CardDescription>توصيات الإدارة والتنبيهات الأخرى</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {unreadAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد تنبيهات جديدة.</p>
          ) : (
            unreadAlerts.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{a.title}</p>
                  {a.message ? (
                    <p className="text-sm text-muted-foreground">{a.message}</p>
                  ) : null}
                  {a.client ? (
                    <Link
                      href={`/clients/${a.client.id}`}
                      className="text-sm text-primary underline-offset-4 hover:underline"
                    >
                      {a.client.name}
                      {a.client.company ? ` — ${a.client.company}` : ""}
                    </Link>
                  ) : null}
                </div>
                <MarkAlertButton alertId={a.id} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <section className="space-y-2">
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
            />
          )}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>توصيات بحاجة لتأكيدك</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {openRecs.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد توصيات مفتوحة.</p>
          ) : (
            openRecs.map((r) => (
              <div key={r.id} className="rounded-md border border-border/50 p-3 text-sm">
                <p className="text-muted-foreground">
                  من {r.author.name} — {r.client?.name}
                </p>
                <p className="mt-1 whitespace-pre-wrap" dir="rtl">
                  {r.body}
                </p>
                <Link
                  href={`/clients/${r.clientId}`}
                  className="mt-2 inline-block text-xs text-primary underline-offset-4 hover:underline"
                >
                  فتح بطاقة العميل
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
