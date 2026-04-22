import { PageHeader } from "@/components/layout/page-header";
import { ReportRecordsCount } from "@/components/reports/report-records-count";
import {
  REPORT_FILTER_EXPORTS_BAR_CLASS,
  ReportPageExportsToolbar,
  type ReportToolbarExportsConfig,
} from "@/components/reports/report-page-exports-toolbar";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { ReportBTable, type ReportBRow } from "@/components/reports/report-b-table";
import { Button } from "@/components/ui/button";
import { listClientClassifications } from "@/lib/data/classifications";
import { listClientsForReport } from "@/lib/data/report-queries";
import { parseReportSortParams } from "@/lib/report-sort-params";
import { clientEntityToReportBRow } from "@/lib/mappers/client-to-report-b-row";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { reportExportExcelHref } from "@/lib/export-excel-href";
import { reportPageDescriptionClass } from "@/lib/report-ui";
import { cn } from "@/lib/utils";
import { ClientStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ReportNotBPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    dir?: string;
    class?: string;
    sales?: string;
  }>;
}) {
  const user = await requireSessionUser();
  const workLogUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const sp = await searchParams;
  const salesKey = sp.sales ?? "all";
  const { sort, dir } = parseReportSortParams(sp);

  const [clients, classifications] = await Promise.all([
    listClientsForReport({
      role: user.role,
      userId: user.id,
      salesUserId: salesKey,
      status: ClientStatus.NOT_B,
      q: sp.q,
      sort,
      sortDir: dir,
    }),
    listClientClassifications(),
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

  const classFilter =
    classKey && classKey !== "all"
      ? classifications.find((x) => x.id === classKey)?.label ?? classKey
      : null;

  const exportsConfig: ReportToolbarExportsConfig = {
    excelHref: reportExportExcelHref({
      kind: "report-not-b",
      sales: salesKey,
      q: sp.q,
      ...(sort ? { sort, ...(dir !== "desc" ? { dir } : {}) } : {}),
      class: classKey && classKey !== "all" ? classKey : undefined,
    }),
    importKind: "report-not-b",
    clientsMappedImport: "not-b",
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="تقرير عملاء Not B"
        subtitle="جميع العملاء غير المصنفين B — نفس أعمدة تقرير B."
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
              pathname="/reports/not-b"
              searchParams={{
                ...(sp.q ? { q: sp.q } : {}),
                ...(classKey && classKey !== "all"
                  ? { class: classKey }
                  : {}),
              }}
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

      <form className="flex flex-wrap items-center gap-2" action="/reports/not-b" method="get">
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
        {classFilter
          ? `التقرير يعرض فقط تصنيف: «${classFilter}»`
          : "التقرير يعرض عملاء Not B"}
        {sp.q ? ` — بحث: «${sp.q}»` : ""}.
      </p>

      <ReportRecordsCount count={rows.length} />

      <ReportBTable
        rows={rows}
        classifications={classifications}
        rowStyleReportType="not-b"
        workLogUserId={workLogUserId}
        workLogUserRole={user.role}
      />
    </div>
  );
}
