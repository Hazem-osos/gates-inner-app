"use client";

import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ReportMappedImportDialog } from "@/components/reports/report-mapped-import-dialog";
import { pdfFromExcelHref, reportImportExcelUrl } from "@/lib/export-excel-href";
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
  excelHref: string;
  className?: string;
  /**
   * نوع التقرير لمسار الاستيراد السريع — يجب أن يطابق أعمدة ملف التصدير من نفس الصفحة.
   * أمثلة: report-b، report-not-b، dashboard-followups
   */
  importKind?: string;
  /**
   * استيراد بنافذة «تعيين الأعمدة» ثم `/api/import/mapped-rows` — يُلغي الاستيراد السريع.
   */
  mappedReportKind?: string;
};

/** تصدير Excel، معاينة طباعة/PDF، واستيراد Excel يحدّث قاعدة البيانات عند تمرير `importKind` أو `mappedReportKind` */
export function ExportToolbar({
  excelHref,
  className,
  importKind,
  mappedReportKind,
}: Props) {
  const router = useRouter();
  const pdfHref = pdfFromExcelHref(excelHref);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const quickImportKind = mappedReportKind ? undefined : importKind;

  async function onQuickImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !quickImportKind) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch(reportImportExcelUrl(quickImportKind), {
        method: "POST",
        body: fd,
      });
      const j = (await r.json()) as {
        message?: string;
        updated?: number;
        processed?: number;
        errors?: string[];
      };
      if (!r.ok) throw new Error(j.message ?? "فشل الاستيراد");
      const errs = j.errors?.length
        ? ` ملاحظات: ${j.errors.slice(0, 5).join(" — ")}`
        : "";
      setMsg(`تم تحديث ${j.updated ?? 0} من ${j.processed ?? 0} صفًا.${errs}`);
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "فشل الاستيراد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap",
        className
      )}
    >
      {mappedReportKind ? (
        <ReportMappedImportDialog kind={mappedReportKind} />
      ) : null}
      {/* <a> وليس Next Link — حتى يطلب المتصفح الملف كتنزيل كامل مع الكوكيز */}
      <a
        href={excelHref}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          REPORT_EXCEL_EXPORT_LINK_CLASS
        )}
      >
        <FileSpreadsheet className={REPORT_EXCEL_EXPORT_ICON_CLASS} aria-hidden />
        تصدير Excel
      </a>
      <a
        href={pdfHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          REPORT_PDF_EXPORT_LINK_CLASS
        )}
      >
        <FileText className={REPORT_PDF_EXPORT_ICON_CLASS} aria-hidden />
        طباعة / PDF
      </a>
      {quickImportKind ? (
        <>
          <label
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              REPORT_EXCEL_IMPORT_LINK_SOLID_CLASS,
              busy ? "pointer-events-none opacity-60" : "cursor-pointer"
            )}
          >
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              disabled={busy}
              onChange={onQuickImport}
            />
            <Upload
              className={REPORT_EXCEL_IMPORT_LINK_ICON_CLASS}
              aria-hidden
            />
            {busy ? "جاري الاستيراد…" : "استيراد من Excel"}
          </label>
        </>
      ) : null}
      {msg ? (
        <span className="max-w-full text-xs text-muted-foreground" dir="rtl">
          {msg}
        </span>
      ) : null}
    </div>
  );
}
