"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { pdfFromExcelHref, reportImportExcelUrl } from "@/lib/export-excel-href";
import {
  REPORT_EXCEL_EXPORT_ICON_CLASS,
  REPORT_EXCEL_EXPORT_LINK_CLASS,
  REPORT_PDF_EXPORT_ICON_CLASS,
  REPORT_PDF_EXPORT_LINK_CLASS,
} from "@/lib/ui/report-export-import-classes";
import { cn } from "@/lib/utils";

type Props = {
  excelHref: string;
  className?: string;
  /**
   * نوع التقرير لمسار الاستيراد — يجب أن يطابق أعمدة ملف التصدير من نفس الصفحة.
   * أمثلة: report-b، report-not-b، report-closed، report-won، warming، report-calls، report-recommendations، dashboard-followups
   */
  importKind?: string;
};

/** تصدير Excel، معاينة طباعة/PDF، واستيراد Excel يحدّث قاعدة البيانات عند تمرير `importKind` */
export function ExportToolbar({ excelHref, className, importKind }: Props) {
  const router = useRouter();
  const pdfHref = pdfFromExcelHref(excelHref);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onQuickImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !importKind) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch(reportImportExcelUrl(importKind), {
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
        "flex flex-wrap items-center justify-end gap-2",
        className
      )}
    >
      <Link
        href={excelHref}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          REPORT_EXCEL_EXPORT_LINK_CLASS
        )}
      >
        <FileSpreadsheet className={REPORT_EXCEL_EXPORT_ICON_CLASS} aria-hidden />
        تصدير Excel
      </Link>
      <Link
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
      </Link>
      {importKind ? (
        <>
          <label
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              REPORT_EXCEL_EXPORT_LINK_CLASS,
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
            {busy ? "جاري الاستيراد…" : "استيراد Excel"}
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
