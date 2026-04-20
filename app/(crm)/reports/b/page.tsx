import { PageHeader } from "@/components/layout/page-header";
import { ExportToolbar } from "@/components/export/export-toolbar";
import { ReportRecordsCount } from "@/components/reports/report-records-count";
import { ReportSortControls } from "@/components/reports/report-sort-controls";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { ExcelClientsImportDialog } from "@/components/reports/excel-clients-import-dialog";
import { ReportBTable, type ReportBRow } from "@/components/reports/report-b-table";
import { Button } from "@/components/ui/button";
import { listClientClassifications } from "@/lib/data/classifications";
import { listReportRowStylesForClients } from "@/lib/data/report-row-styles";
import { listClientsForReport } from "@/lib/data/report-queries";
import { clientEntityToReportBRow } from "@/lib/mappers/client-to-report-b-row";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { reportExportExcelHref } from "@/lib/export-excel-href";
import { parseReportSortParams } from "@/lib/report-sort-params";
import { ClientStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ReportBPage({
  searchParams,
}: {
  searchParams: Promise<{ sales?: string; sort?: string; dir?: string }>;
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
      status: ClientStatus.B,
      sort,
      sortDir: dir,
    }),
    listClientClassifications(),
  ]);

  const rowStyles = await listReportRowStylesForClients({
    userId: stylesUserId,
    reportKey: "report-b",
    clientIds: clients.map((c) => c.id),
  });

  const rows: ReportBRow[] = clients.map(clientEntityToReportBRow);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="تقرير عملاء B"
        subtitle="العملاء المصنفون B — تعديل مباشر مع حفظ تلقائي."
      />

      <SalesFilterLinks
        role={user.role}
        pathname="/reports/b"
        searchParams={{
          ...(sort ? { sort } : {}),
          ...(dir !== "desc" ? { dir } : {}),
        }}
        currentSales={salesKey}
      />

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-muted/20 p-4"
      >
        {salesKey !== "all" ? (
          <input type="hidden" name="sales" value={salesKey} />
        ) : null}
        <ReportSortControls defaultSort={sort} defaultDir={dir} />
        <Button type="submit" size="sm" variant="secondary">
          تطبيق الترتيب
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ExcelClientsImportDialog importType="b" />
        <ExportToolbar
          importKind="report-b"
          excelHref={reportExportExcelHref({
            kind: "report-b",
            sales: salesKey,
            ...(sort ? { sort, ...(dir !== "desc" ? { dir } : {}) } : {}),
          })}
        />
      </div>

      <ReportRecordsCount count={rows.length} />

      <ReportBTable
        rows={rows}
        classifications={classifications}
        rowStyles={rowStyles}
        currentUserId={stylesUserId}
      />
    </div>
  );
}
