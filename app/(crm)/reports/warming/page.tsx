import Link from "next/link";

import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { ReportWorkLogDialog } from "@/components/reports/report-work-log-dialog";
import {
  WarmingReportTable,
  type WarmingReportRow,
} from "@/components/reports/warming-report-table";
import { GenericFilterActiveNotice, SalesFilterActiveMessage } from "@/components/reports/sales-filter-records-status";
import { ReportRecordsCount } from "@/components/reports/report-records-count";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { resolveActiveSalesName } from "@/lib/resolve-active-sales-name";
import { buttonVariants } from "@/components/ui/button";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/report-scope";
import { warmingExportExcelHref } from "@/lib/export-excel-href";
import { cn } from "@/lib/utils";
import { addDays, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

function passesOverdue(row: WarmingReportRow, today: Date): boolean {
  if (!row.contactDateIso) return false;
  const c = startOfDay(new Date(row.contactDateIso));
  const d1 = c;
  const d2 = addDays(c, 1);
  const d3 = addDays(c, 2);
  const t = startOfDay(today);
  return (
    (d1 <= t && !row.day1Done) ||
    (d2 <= t && !row.day2Done) ||
    (d3 <= t && !row.day3Done)
  );
}

export default async function ReportWarmingPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; sales?: string }>;
}) {
  const user = await requireSessionUser();
  const workLogUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const sp = await searchParams;
  const mode = sp.mode === "overdue" ? "overdue" : "all";
  const salesKey = sp.sales ?? "all";

  const scope = clientScopeWhere({
    role: user.role,
    userId: user.id,
    salesUserId: salesKey,
  });

  const [clients, activeSalesName] = await Promise.all([
    prisma.client.findMany({
      where: scope,
      select: {
        id: true,
        name: true,
        activity: true,
        phone: true,
        initialCallDate: true,
        clientWarmingText: true,
        warmingTools: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            day1Done: true,
            day2Done: true,
            day3Done: true,
            day2Content: true,
            day3Content: true,
          },
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 800,
    }),
    resolveActiveSalesName(user.role, salesKey),
  ]);

  const today = new Date();
  let rows: WarmingReportRow[] = clients.map((c) => {
    const w = c.warmingTools[0];
    return {
      clientId: c.id,
      clientName: c.name,
      activity: c.activity,
      phone: c.phone,
      contactDateIso: c.initialCallDate?.toISOString() ?? null,
      warmingText: c.clientWarmingText,
      day2Text: w?.day2Content ?? null,
      day3Text: w?.day3Content ?? null,
      day1Done: w?.day1Done ?? false,
      day2Done: w?.day2Done ?? false,
      day3Done: w?.day3Done ?? false,
    };
  });

  if (mode === "overdue") {
    rows = rows.filter((r) => passesOverdue(r, today));
  }

  const filterActive = mode === "overdue" || salesKey !== "all";

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="أدوات Warming"
        subtitle="تتبّع اليوم الأول والثاني والثالث بعد تاريخ الاتصال الأول."
      />

      <SalesFilterLinks
        role={user.role}
        pathname="/reports/warming"
        searchParams={{
          ...(mode === "overdue" ? { mode: "overdue" } : {}),
        }}
        currentSales={salesKey}
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/reports/warming${salesKey !== "all" ? `?sales=${salesKey}` : ""}`}
          className={cn(
            buttonVariants({ variant: mode === "all" ? "default" : "outline", size: "sm" })
          )}
        >
          عرض الكل
        </Link>
        <Link
          href={`/reports/warming?mode=overdue${salesKey !== "all" ? `&sales=${salesKey}` : ""}`}
          className={cn(
            buttonVariants({
              variant: mode === "overdue" ? "default" : "outline",
              size: "sm",
            })
          )}
        >
          عرض تاريخ اليوم أو ما سبق ولم يتم إرسال أدوات
        </Link>
      </div>

      {activeSalesName ? (
        <SalesFilterActiveMessage activeSalesName={activeSalesName} />
      ) : filterActive ? (
        <GenericFilterActiveNotice />
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ReportWorkLogDialog
          reportKey="report-warming"
          userId={workLogUserId}
          userRole={user.role}
        />
        <ExportToolbar
          mappedReportKind="warming"
          excelHref={warmingExportExcelHref({
            mode,
            sales: salesKey,
          })}
        />
      </div>

      <ReportRecordsCount count={rows.length} />

      <WarmingReportTable rows={rows} />

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/clients" className="text-primary underline">
          العملاء
        </Link>
      </p>
    </div>
  );
}
