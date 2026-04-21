"use client";

import { ExportToolbar } from "@/components/export/export-toolbar";
import { ExcelClientsImportDialog } from "@/components/reports/excel-clients-import-dialog";
import { ReportMappedImportDialog } from "@/components/reports/report-mapped-import-dialog";
import { cn } from "@/lib/utils";

/** نفس إعدادات `ReportBTable` السابقة — لعرضها في صفحة التقرير بجانب فلتر السيلز */
export type ReportToolbarExportsConfig = {
  excelHref: string;
  importKind?: string;
  clientsMappedImport?: "b" | "not-b";
  /** استيراد بتحديث صفوف التقرير بعد تعيين الأعمدة (مثل report-closed) */
  reportMappedImportKind?: string;
};

export const REPORT_FILTER_EXPORTS_BAR_CLASS =
  "sticky top-14 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/95 px-3 py-2 text-sm shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-muted/90";

export function ReportPageExportsToolbar({
  config,
  className,
}: {
  config: ReportToolbarExportsConfig;
  className?: string;
}) {
  const toolbarImportKind =
    config.clientsMappedImport || config.reportMappedImportKind
      ? undefined
      : config.importKind;

  return (
    <div
      data-gate-exempt
      className={cn(
        "flex max-w-full flex-wrap items-center justify-end gap-2",
        className
      )}
      dir="rtl"
    >
      {config.clientsMappedImport ? (
        <ExcelClientsImportDialog
          importType={config.clientsMappedImport}
        />
      ) : null}
      {config.reportMappedImportKind ? (
        <ReportMappedImportDialog kind={config.reportMappedImportKind} />
      ) : null}
      <ExportToolbar
        excelHref={config.excelHref}
        importKind={toolbarImportKind}
        className="justify-end"
      />
    </div>
  );
}
