import Link from "next/link";

import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { ReportRecordsCount } from "@/components/reports/report-records-count";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { ExcelClientsImportDialog } from "@/components/reports/excel-clients-import-dialog";
import { ReportBTable, type ReportBRow } from "@/components/reports/report-b-table";
import { ReportSortControls } from "@/components/reports/report-sort-controls";
import { Button } from "@/components/ui/button";
import { listClientClassifications } from "@/lib/data/classifications";
import { listReportRowStylesForClients } from "@/lib/data/report-row-styles";
import { listClientsForReport } from "@/lib/data/report-queries";
import { parseReportSortParams } from "@/lib/report-sort-params";
import { clientEntityToReportBRow } from "@/lib/mappers/client-to-report-b-row";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { reportExportExcelHref } from "@/lib/export-excel-href";
import { reportPageDescriptionClass } from "@/lib/report-ui";
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
  const stylesUserId = (await resolveSessionDbUserId(user)) ?? user.id;
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

  const rowStyles = await listReportRowStylesForClients({
    userId: stylesUserId,
    reportKey: "report-not-b",
    clientIds: filtered.map((c) => c.id),
  });

  const rows: ReportBRow[] = filtered.map(clientEntityToReportBRow);

  const classFilter =
    classKey && classKey !== "all"
      ? classifications.find((x) => x.id === classKey)?.label ?? classKey
      : null;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="تقرير عملاء Not B"
        subtitle="جميع العملاء غير المصنفين B — نفس أعمدة تقرير B."
      />

      <SalesFilterLinks
        role={user.role}
        pathname="/reports/not-b"
        searchParams={{
          ...(sp.q ? { q: sp.q } : {}),
          ...(sort ? { sort } : {}),
          ...(dir !== "desc" ? { dir } : {}),
          ...(classKey && classKey !== "all"
            ? { class: classKey }
            : {}),
        }}
        currentSales={salesKey}
      />

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
        <ReportSortControls defaultSort={sort} defaultDir={dir} />
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

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ExcelClientsImportDialog importType="not-b" />
        <ExportToolbar
          importKind="report-not-b"
          excelHref={reportExportExcelHref({
            kind: "report-not-b",
            sales: salesKey,
            q: sp.q,
            ...(sort ? { sort, ...(dir !== "desc" ? { dir } : {}) } : {}),
            class: classKey && classKey !== "all" ? classKey : undefined,
          })}
        />
      </div>

      <ReportRecordsCount count={rows.length} />

      <ReportBTable
        rows={rows}
        classifications={classifications}
        rowStyles={rowStyles}
        currentUserId={stylesUserId}
        rowStyleReportType="not-b"
      />
    </div>
  );
}
