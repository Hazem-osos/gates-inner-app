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
import { ClientsListData } from "./_components/clients-list-data";

export const dynamic = "force-dynamic";

export default async function ClientsListPage({
  searchParams,
}: {
  searchParams: Promise<{ sales?: string; q?: string }>;
}) {
  const user = await requireSessionUser();
  const dbUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const sp = await searchParams;
  const salesKey = sp.sales ?? "all";
  const qRaw = sp.q?.trim() ?? "";
  const q = qRaw || undefined;

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
        searchParams={q ? { q: qRaw } : {}}
        currentSales={salesKey}
      />

      <form
        method="get"
        className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end"
        role="search"
      >
        {salesKey !== "all" ? (
          <input type="hidden" name="sales" value={salesKey} />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <label
            htmlFor="clients-q"
            className="text-xs font-medium text-muted-foreground"
          >
            بحث
          </label>
          <input
            id="clients-q"
            name="q"
            type="search"
            defaultValue={qRaw}
            placeholder="اسم العميل، الشركة، أو الهاتف"
            dir="rtl"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="h-9 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          بحث
        </button>
        {q ? (
          <Link
            href={salesKey !== "all" ? `/clients?sales=${salesKey}` : "/clients"}
            className="h-9 shrink-0 self-end rounded-md border border-input px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 sm:self-auto"
          >
            مسح
          </Link>
        ) : null}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ExportToolbar
          excelHref={clientsListExportHref({ sales: salesKey, q: qRaw })}
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
        key={`${salesKey}-${qRaw}`}
      >
        <ClientsListData
          role={user.role}
          dbUserId={dbUserId}
          salesKey={salesKey}
          q={q}
          qRaw={qRaw}
        />
      </Suspense>
    </div>
  );
}
