import { PageHeader } from "@/components/layout/page-header";
import {
  REPORT_FILTER_EXPORTS_BAR_CLASS,
  ReportPageExportsToolbar,
  type ReportToolbarExportsConfig,
} from "@/components/reports/report-page-exports-toolbar";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { ReportBTable, type ReportBRow } from "@/components/reports/report-b-table";
import { Button } from "@/components/ui/button";
import { GenericFilterActiveNotice } from "@/components/reports/sales-filter-records-status";
import { listClientClassifications } from "@/lib/data/classifications";
import { listClientsForReport } from "@/lib/data/report-queries";
import { clientEntityToReportBRow } from "@/lib/mappers/client-to-report-b-row";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { resolveActiveSalesName } from "@/lib/resolve-active-sales-name";
import { reportExportExcelHref } from "@/lib/export-excel-href";
import { parseReportSortParams } from "@/lib/report-sort-params";
import { reportPageDescriptionClass } from "@/lib/report-ui";
import { cn } from "@/lib/utils";
import { ClientStatus } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

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

export default async function ReportWonPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    sales?: string;
    sort?: string;
    dir?: string;
    q?: string;
  }>;
}) {
  const user = await requireSessionUser();
  const workLogUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const sp = await searchParams;
  const salesKey = sp.sales ?? "all";
  const { sort, dir } = parseReportSortParams(sp);

  const [clientsRaw, classifications, activeSalesName] = await Promise.all([
    listClientsForReport({
      role: user.role,
      userId: user.id,
      salesUserId: salesKey,
      status: ClientStatus.WON,
      q: sp.q,
      sort,
      sortDir: dir,
      noRowLimit: true,
    }),
    listClientClassifications(),
    resolveActiveSalesName(user.role, salesKey),
  ]);

  const from = safeStartOfDayFromYmd(sp.from);
  const to = safeEndOfDayFromYmd(sp.to);
  const clients = clientsRaw.filter((c) => {
    if (!c.saleDate) return false;
    if (from && c.saleDate < from) return false;
    if (to && c.saleDate > to) return false;
    return true;
  });

  const rows: ReportBRow[] = clients.map(clientEntityToReportBRow);

  const filterActive =
    salesKey !== "all" || Boolean(sp.from || sp.to || sp.q?.trim());

  const exportsConfig: ReportToolbarExportsConfig = {
    excelHref: reportExportExcelHref({
      kind: "report-won",
      sales: salesKey,
      q: sp.q,
      from: sp.from,
      to: sp.to,
      ...(sort ? { sort, ...(dir !== "desc" ? { dir } : {}) } : {}),
    }),
    importKind: "report-won",
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="تم البيع"
        subtitle="نفس جدول تقرير B / Not B — مع تاريخ التعاقد وقيمة البيع وعمود الإجراءات."
      />

      <div
        className={cn(
          REPORT_FILTER_EXPORTS_BAR_CLASS,
          user.role === "SALES" ? "justify-start" : "justify-between"
        )}
        dir="rtl"
      >
        <ReportPageExportsToolbar config={exportsConfig} />
        {user.role !== "SALES" ? (
          <div className="flex min-w-0 max-w-full flex-col items-end gap-1 self-center">
            <SalesFilterLinks
              bare
              role={user.role}
              pathname="/reports/won"
              searchParams={{
                ...(sp.from ? { from: sp.from } : {}),
                ...(sp.to ? { to: sp.to } : {}),
                ...(sp.q?.trim() ? { q: sp.q.trim() } : {}),
                ...(sort ? { sort } : {}),
                ...(dir && dir !== "desc" ? { dir } : {}),
              }}
              currentSales={salesKey}
            />
          </div>
        ) : null}
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 p-4"
      >
        {salesKey !== "all" ? (
          <input type="hidden" name="sales" value={salesKey} />
        ) : null}
        {sort ? <input type="hidden" name="sort" value={sort} /> : null}
        {dir && dir !== "desc" ? (
          <input type="hidden" name="dir" value={dir} />
        ) : null}
        <div>
          <label className="text-xs text-muted-foreground">من (تاريخ التعاقد)</label>
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
        <div className="min-w-[12rem] flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">بحث</label>
          <input
            name="q"
            type="search"
            defaultValue={sp.q ?? ""}
            placeholder="اسم، شركة، هاتف"
            dir="rtl"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
        <Button type="submit" size="sm" variant="secondary">
          تطبيق
        </Button>
      </form>

      <p className={reportPageDescriptionClass}>
        يظهر فقط من لديهم تاريخ تعاقد (بيع) ضمن نطاق التاريخ إن وُجد. باقي الأعمدة
        مثل تقرير B / Not B مع الحفظ والإجراءات.
      </p>

      {!activeSalesName && filterActive ? <GenericFilterActiveNotice /> : null}

      <ReportBTable
        rows={rows}
        classifications={classifications}
        rowStyleReportType="not-b"
        auditReportKey="report-won"
        workLogUserId={workLogUserId}
        workLogUserRole={user.role}
        activeSalesName={activeSalesName}
        wonSaleColumns
      />
    </div>
  );
}
