import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  REPORT_EXCEL_EXPORT_ICON_CLASS,
  REPORT_EXCEL_EXPORT_LINK_CLASS,
  REPORT_EXCEL_IMPORT_LINK_ICON_CLASS,
  REPORT_EXCEL_IMPORT_LINK_SOLID_CLASS,
  REPORT_PDF_EXPORT_ICON_CLASS,
  REPORT_PDF_EXPORT_LINK_CLASS,
} from "@/lib/ui/report-export-import-classes";
import { cn } from "@/lib/utils";

type Props = {
  excelHref?: string;
  pdfHref?: string;
  importHref?: string;
  className?: string;
};

export function DataPageToolbar({
  excelHref,
  pdfHref,
  importHref,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-3",
        className
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">بيانات:</span>
      {excelHref ? (
        <Link
          href={excelHref}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8",
            REPORT_EXCEL_EXPORT_LINK_CLASS
          )}
        >
          <FileSpreadsheet
            className={REPORT_EXCEL_EXPORT_ICON_CLASS}
            aria-hidden
          />
          تصدير Excel
        </Link>
      ) : null}
      {pdfHref ? (
        <Link
          href={pdfHref}
          title="يوضّح أن التصدير الأساسي عبر Excel من التقرير"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8",
            REPORT_PDF_EXPORT_LINK_CLASS
          )}
        >
          <FileText className={REPORT_PDF_EXPORT_ICON_CLASS} aria-hidden />
          تصدير PDF
        </Link>
      ) : null}
      {importHref ? (
        <Link
          href={importHref}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8",
            REPORT_EXCEL_IMPORT_LINK_SOLID_CLASS
          )}
        >
          <Upload
            className={REPORT_EXCEL_IMPORT_LINK_ICON_CLASS}
            aria-hidden
          />
          استيراد Excel
        </Link>
      ) : null}
    </div>
  );
}
