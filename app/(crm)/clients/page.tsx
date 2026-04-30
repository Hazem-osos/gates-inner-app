import { FileSpreadsheet, Upload } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import {
  ClientsListCardSkeleton,
  ClientsStatsLineSkeleton,
} from "@/components/skeletons/crm-skeletons";
import { clientsImportTemplateHref, clientsListExportHref } from "@/lib/export-excel-href";
import { buttonVariants } from "@/components/ui/button";
import {
  REPORT_EXCEL_EXPORT_ICON_CLASS,
  REPORT_EXCEL_EXPORT_LINK_CLASS,
  REPORT_EXCEL_IMPORT_LINK_ICON_CLASS,
  REPORT_EXCEL_IMPORT_LINK_SOLID_CLASS,
} from "@/lib/ui/report-export-import-classes";
import { cn } from "@/lib/utils";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { clientsListQueryFromSearchParams } from "@/lib/data/clients-list";
import { prisma } from "@/lib/prisma";
import { ClientsListData } from "./_components/clients-list-data";
import { ClientsListFiltersForm } from "./_components/clients-list-filters-form";

export const dynamic = "force-dynamic";

export default async function ClientsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireSessionUser();
  const dbUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const sp = await searchParams;
  const salesKey = sp.sales ?? "all";

  const classifications = await prisma.clientClassification.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, label: true },
  });
  const validClassificationIds = new Set(classifications.map((c) => c.id));

  const listQuery = clientsListQueryFromSearchParams(sp, {
    validClassificationIds,
  });

  const preservedSearch: Record<string, string | undefined> = {};
  if (listQuery.q?.trim()) preservedSearch.q = listQuery.q.trim();
  if (listQuery.notClosed) preservedSearch.f_nc = "1";
  if (listQuery.closedLost) preservedSearch.f_cl = "1";
  if (listQuery.won) preservedSearch.f_won = "1";
  if (listQuery.notWon) preservedSearch.f_nw = "1";
  const clsVal = listQuery.classificationKey?.trim();
  if (clsVal && clsVal !== "all") preservedSearch.cls = clsVal;

  const suspenseKey = [
    salesKey,
    listQuery.q?.trim() ?? "",
    listQuery.notClosed ? "1" : "",
    listQuery.closedLost ? "1" : "",
    listQuery.won ? "1" : "",
    listQuery.notWon ? "1" : "",
    clsVal ?? "",
  ].join("|");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="قائمة العملاء"
        subtitle={
          user.role === "SALES"
            ? "عملاءك المسندة إليك."
            : "كل العملاء — يمكنك نقل السيلز من القائمة."
        }
      />

      <SalesFilterLinks
        role={user.role}
        pathname="/clients"
        searchParams={preservedSearch}
        currentSales={salesKey}
      />

      <ClientsListFiltersForm
        salesKey={salesKey}
        listQuery={listQuery}
        classifications={classifications}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ExportToolbar
          excelHref={clientsListExportHref({
            sales: salesKey,
            q: listQuery.q?.trim(),
            notClosed: listQuery.notClosed,
            closedLost: listQuery.closedLost,
            won: listQuery.won,
            notWon: listQuery.notWon,
            cls: clsVal && clsVal !== "all" ? clsVal : undefined,
          })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={clientsImportTemplateHref()}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              REPORT_EXCEL_EXPORT_LINK_CLASS
            )}
          >
            <FileSpreadsheet
              className={REPORT_EXCEL_EXPORT_ICON_CLASS}
              aria-hidden
            />
            تنزيل قالب Excel
          </a>
          <Link
            href="/clients/import"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              REPORT_EXCEL_IMPORT_LINK_SOLID_CLASS
            )}
          >
            <Upload
              className={REPORT_EXCEL_IMPORT_LINK_ICON_CLASS}
              aria-hidden
            />
            استيراد من Excel
          </Link>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <ClientsStatsLineSkeleton />
            <ClientsListCardSkeleton />
          </div>
        }
        key={suspenseKey}
      >
        <ClientsListData
          role={user.role}
          dbUserId={dbUserId}
          salesKey={salesKey}
          listQuery={listQuery}
          classifications={classifications}
        />
      </Suspense>
    </div>
  );
}
