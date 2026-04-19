import Link from "next/link";

import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { ReportBTable, type ReportBRow } from "@/components/reports/report-b-table";
import { ReportRecordsCount } from "@/components/reports/report-records-count";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { buttonVariants } from "@/components/ui/button";
import { listClientClassifications } from "@/lib/data/classifications";
import { listReportRowStylesForClients } from "@/lib/data/report-row-styles";
import { listClientsForReport } from "@/lib/data/report-queries";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { reportExportExcelHref } from "@/lib/export-excel-href";
import { clientEntityToReportBRow } from "@/lib/mappers/client-to-report-b-row";
import { ClientStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ReportClosedPage({
  searchParams,
}: {
  searchParams: Promise<{ sales?: string }>;
}) {
  const user = await requireSessionUser();
  const stylesUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const sp = await searchParams;
  const salesKey = sp.sales ?? "all";

  const [clients, classifications] = await Promise.all([
    listClientsForReport({
      role: user.role,
      userId: user.id,
      salesUserId: salesKey,
      status: ClientStatus.LOST,
      take: 500,
    }),
    listClientClassifications(),
  ]);

  const rowStyles = await listReportRowStylesForClients({
    userId: stylesUserId,
    reportKey: "report-b",
    clientIds: clients.map((c) => c.id),
  });

  const rows: ReportBRow[] = clients.map(clientEntityToReportBRow);

  const filterActive = salesKey !== "all";

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="العملاء المغلقة"
        subtitle="بيانات العملاء كما في تقرير B مع أعمدة الإغلاق — بدون أدوات الفلترة العلوية الإضافية."
      />

      <SalesFilterLinks
        role={user.role}
        pathname="/reports/closed"
        searchParams={{}}
        currentSales={salesKey}
      />

      <ExportToolbar
        importKind="report-closed"
        excelHref={reportExportExcelHref({
          kind: "report-closed",
          sales: salesKey,
        })}
      />

      <ReportRecordsCount count={rows.length} />

      <p className="text-xs text-destructive">
        التقرير يعرض العملاء بحالة تم الإغلاق فقط — الشبكة الكاملة قابلة للتعديل كتقرير B.
      </p>

      {filterActive ? (
        <p className="text-sm font-medium text-destructive">
          يوجد فلتر نشط على النتائج المعروضة.
        </p>
      ) : null}

      <ReportBTable
        rows={rows}
        classifications={classifications}
        rowStyles={rowStyles}
        currentUserId={stylesUserId}
        toolbar="closed"
      />
    </div>
  );
}
