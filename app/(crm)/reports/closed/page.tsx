import { PageHeader } from "@/components/layout/page-header";
import { ReportBTable, type ReportBRow } from "@/components/reports/report-b-table";
import {
  REPORT_FILTER_EXPORTS_BAR_CLASS,
  ReportPageExportsToolbar,
  type ReportToolbarExportsConfig,
} from "@/components/reports/report-page-exports-toolbar";
import { GenericFilterActiveNotice, SalesFilterActiveMessage } from "@/components/reports/sales-filter-records-status";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { resolveActiveSalesName } from "@/lib/resolve-active-sales-name";
import { Button } from "@/components/ui/button";
import { listClientClassifications } from "@/lib/data/classifications";
import { listClientsForReport } from "@/lib/data/report-queries";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { reportExportExcelHref } from "@/lib/export-excel-href";
import { listReportRowStylesForClients } from "@/lib/data/report-row-styles";
import { reportStyleDbKeyFromTableType } from "@/lib/report-row-style-ui";
import { reportPageDescriptionClass } from "@/lib/report-ui";
import { cn } from "@/lib/utils";
import { parseReportSortParams } from "@/lib/report-sort-params";
import { clientEntityToReportBRow } from "@/lib/mappers/client-to-report-b-row";
import { ClientStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ReportClosedPage({
  searchParams,
}: {
  searchParams: Promise<{
    sales?: string;
    sort?: string;
    dir?: string;
    q?: string;
    class?: string;
  }>;
}) {
  const user = await requireSessionUser();
  const workLogUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const sp = await searchParams;
  const salesKey = sp.sales ?? "all";
  const { sort, dir } = parseReportSortParams(sp);

  const [clients, classifications, activeSalesName] = await Promise.all([
    listClientsForReport({
      role: user.role,
      userId: user.id,
      salesUserId: salesKey,
      status: ClientStatus.LOST,
      q: sp.q,
      sort,
      sortDir: dir,
    }),
    listClientClassifications(),
    resolveActiveSalesName(user.role, salesKey),
  ]);

  const classKey = sp.class?.trim();
  const filtered =
    classKey && classKey !== "all"
      ? clients.filter(
          (c) =>
            c.classificationId === classKey ||
            c.notBClassification === classKey
        )
      : clients;

  const rows: ReportBRow[] = filtered.map(clientEntityToReportBRow);

  const rowStyles = await listReportRowStylesForClients({
    reportKey: reportStyleDbKeyFromTableType("closed"),
    clientIds: filtered.map((c) => c.id),
  });

  const classFilter =
    classKey && classKey !== "all"
      ? classifications.find((x) => x.id === classKey)?.label ?? classKey
      : null;

  const filterActive =
    salesKey !== "all" ||
    Boolean(sp.q?.trim()) ||
    Boolean(classKey && classKey !== "all");

  const exportsConfig: ReportToolbarExportsConfig = {
    excelHref: reportExportExcelHref({
      kind: "report-closed",
      sales: salesKey,
      q: sp.q,
      ...(sort ? { sort, ...(dir !== "desc" ? { dir } : {}) } : {}),
      class: classKey && classKey !== "all" ? classKey : undefined,
    }),
    reportMappedImportKind: "report-closed",
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="العملاء المغلقة"
        subtitle="بيانات العملاء كما في تقرير B مع أعمدة الإغلاق — نفس فلاتر التصنيف والبحث وترتيب الأعمدة وتجاوزات التقرير."
      />

      <div
        className={cn(
          REPORT_FILTER_EXPORTS_BAR_CLASS,
          user.role === "SALES" ? "justify-start" : "justify-between"
        )}
        dir="rtl"
      >
        <ReportPageExportsToolbar config={exportsConfig} />
        <SalesFilterLinks
          bare
          role={user.role}
          pathname="/reports/closed"
          searchParams={{
            ...(sp.q ? { q: sp.q } : {}),
            ...(classKey && classKey !== "all"
              ? { class: classKey }
              : {}),
          }}
          currentSales={salesKey}
        />
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        action="/reports/closed"
        method="get"
      >
        {salesKey !== "all" ? (
          <input type="hidden" name="sales" value={salesKey} />
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          عرض حسب التصنيف
          <select
            name="class"
            defaultValue={classKey && classKey !== "" ? classKey : "all"}
            className="h-9 min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="all">الكل</option>
            {classifications.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.label}
              </option>
            ))}
          </select>
        </label>
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="بحث"
          className="h-9 min-w-[180px] rounded-md border border-input bg-background px-2 text-sm"
          dir="rtl"
        />
        <Button type="submit" size="sm" variant="secondary">
          تطبيق
        </Button>
      </form>

      <p className={reportPageDescriptionClass}>
        التقرير يعرض العملاء بحالة تم الإغلاق فقط
        {classFilter ? ` — تصنيف: «${classFilter}»` : ""}
        {sp.q ? ` — بحث: «${sp.q}»` : ""}.
      </p>

      {activeSalesName ? (
        <SalesFilterActiveMessage activeSalesName={activeSalesName} />
      ) : filterActive ? (
        <GenericFilterActiveNotice />
      ) : null}

      <ReportBTable
        rows={rows}
        classifications={classifications}
        rowStyleReportType="closed"
        toolbar="closed"
        workLogUserId={workLogUserId}
        workLogUserRole={user.role}
        activeSalesName={activeSalesName}
        rowStyles={rowStyles}
      />
    </div>
  );
}
