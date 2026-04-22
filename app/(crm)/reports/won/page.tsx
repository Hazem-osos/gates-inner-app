import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";

import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { GenericFilterActiveNotice, SalesFilterActiveMessage } from "@/components/reports/sales-filter-records-status";
import { ReportRecordsCount } from "@/components/reports/report-records-count";
import { ReportWorkLogDialog } from "@/components/reports/report-work-log-dialog";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { resolveActiveSalesName } from "@/lib/resolve-active-sales-name";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateArabicLong } from "@/lib/date-arabic";
import { listClientsForReport } from "@/lib/data/report-queries";
import { parseReportSortParams } from "@/lib/report-sort-params";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { reportExportExcelHref } from "@/lib/export-excel-href";
import { reportPageDescriptionClass } from "@/lib/report-ui";
import { cn } from "@/lib/utils";
import { ClientStatus } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

function WonLoadingFallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-16">
      <p className="text-center text-sm text-muted-foreground">
        جاري تحميل تقرير تم البيع…
      </p>
    </div>
  );
}

function safeStartOfDayFromYmd(ymd: string | undefined): Date | null {
  if (!ymd?.trim()) return null;
  const d = new Date(ymd.trim());
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
}

function safeEndOfDayFromYmd(ymd: string | undefined): Date | null {
  if (!ymd?.trim()) return null;
  const d = new Date(ymd.trim());
  if (Number.isNaN(d.getTime())) return null;
  return endOfDay(d);
}

function formatSaleCell(iso: Date | null | undefined): string {
  if (!iso) return "—";
  const t = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(t.getTime())) return "—";
  return formatDateArabicLong(t);
}

export default function ReportWonPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    sales?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  return (
    <Suspense fallback={<WonLoadingFallback />}>
      <ReportWonContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ReportWonContent({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    sales?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  await connection();
  const user = await requireSessionUser();
  const workLogUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const sp = await searchParams;
  const salesKey = sp.sales ?? "all";
  const { sort, dir } = parseReportSortParams(sp);

  const [clients, activeSalesName] = await Promise.all([
    listClientsForReport({
      role: user.role,
      userId: user.id,
      salesUserId: salesKey,
      status: ClientStatus.WON,
      sort,
      sortDir: dir,
      take: 500,
    }),
    resolveActiveSalesName(user.role, salesKey),
  ]);

  const from = safeStartOfDayFromYmd(sp.from);
  const to = safeEndOfDayFromYmd(sp.to);
  const filtered = clients.filter((c) => {
    if (!c.saleDate) return false;
    if (from && c.saleDate < from) return false;
    if (to && c.saleDate > to) return false;
    return true;
  });

  const filterActive =
    salesKey !== "all" || Boolean(sp.from || sp.to);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="تم البيع"
        subtitle="عملاء اكتمل بيعهم."
      />

      <SalesFilterLinks
        role={user.role}
        pathname="/reports/won"
        searchParams={{
          ...(sp.from ? { from: sp.from } : {}),
          ...(sp.to ? { to: sp.to } : {}),
        }}
        currentSales={salesKey}
      />

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 p-4"
      >
        {salesKey !== "all" ? (
          <input type="hidden" name="sales" value={salesKey} />
        ) : null}
        <div>
          <label className="text-xs text-muted-foreground">من</label>
          <input
            type="date"
            name="from"
            defaultValue={sp.from ?? ""}
            className="mt-0.5 block h-9 min-w-[10rem] rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm"
            dir="ltr"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">إلى</label>
          <input
            type="date"
            name="to"
            defaultValue={sp.to ?? ""}
            className="mt-0.5 block h-9 min-w-[10rem] rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm"
            dir="ltr"
          />
        </div>
        <button type="submit" className={cn(buttonVariants(), "h-9")}>
          فلترة
        </button>
      </form>

      <p className={reportPageDescriptionClass}>
        يعرض العملاء الذين تم البيع لهم فقط (مع فلتر التاريخ إن وُجد).
      </p>

      {activeSalesName ? (
        <SalesFilterActiveMessage activeSalesName={activeSalesName} />
      ) : filterActive ? (
        <GenericFilterActiveNotice />
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ReportWorkLogDialog
          reportKey="report-won"
          userId={workLogUserId}
          userRole={user.role}
        />
        <ExportToolbar
          mappedReportKind="report-won"
          excelHref={reportExportExcelHref({
            kind: "report-won",
            sales: salesKey,
            from: sp.from,
            to: sp.to,
            ...(sort ? { sort, ...(dir !== "desc" ? { dir } : {}) } : {}),
          })}
        />
      </div>

      <ReportRecordsCount count={filtered.length} />

      <div className="overflow-x-auto rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>تاريخ البيع</TableHead>
              <TableHead>قيمة التعاقد</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>شركة</TableHead>
              <TableHead>هاتف</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell dir="ltr" className="text-xs">
                  {formatSaleCell(c.saleDate)}
                </TableCell>
                <TableCell dir="ltr">
                  {c.contractValue != null ? String(c.contractValue) : "—"}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/clients/${c.id}`}
                    className="text-primary underline"
                  >
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.company ?? "—"}</TableCell>
                <TableCell dir="ltr">{c.phone}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
