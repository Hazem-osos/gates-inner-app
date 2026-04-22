import { PageHeader } from "@/components/layout/page-header";
import {
  REPORT_FILTER_EXPORTS_BAR_CLASS,
  ReportPageExportsToolbar,
  type ReportToolbarExportsConfig,
} from "@/components/reports/report-page-exports-toolbar";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { ReportBTable, type ReportBRow } from "@/components/reports/report-b-table";
import { listClientClassifications } from "@/lib/data/classifications";
import { listClientsForReport } from "@/lib/data/report-queries";
import { clientEntityToReportBRow } from "@/lib/mappers/client-to-report-b-row";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { resolveActiveSalesName } from "@/lib/resolve-active-sales-name";
import { reportExportExcelHref } from "@/lib/export-excel-href";
import { parseReportSortParams } from "@/lib/report-sort-params";
import { cn } from "@/lib/utils";
import { ClientStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ReportBPage({
  searchParams,
}: {
  searchParams: Promise<{ sales?: string; sort?: string; dir?: string }>;
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
      status: ClientStatus.B,
      sort,
      sortDir: dir,
    }),
    listClientClassifications(),
    resolveActiveSalesName(user.role, salesKey),
  ]);

  const rows: ReportBRow[] = clients.map(clientEntityToReportBRow);

  const exportsConfig: ReportToolbarExportsConfig = {
    excelHref: reportExportExcelHref({
      kind: "report-b",
      sales: salesKey,
      ...(sort ? { sort, ...(dir !== "desc" ? { dir } : {}) } : {}),
    }),
    importKind: "report-b",
    clientsMappedImport: "b",
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="تقرير عملاء B"
        subtitle="العملاء المصنفون B — تعديل مباشر مع حفظ تلقائي."
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
              pathname="/reports/b"
              searchParams={{}}
              currentSales={salesKey}
            />
          </div>
        ) : null}
      </div>

      <ReportBTable
        rows={rows}
        classifications={classifications}
        workLogUserId={workLogUserId}
        workLogUserRole={user.role}
        activeSalesName={activeSalesName}
      />
    </div>
  );
}
