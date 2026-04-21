"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ReportExcelImportDialog } from "@/components/import/report-excel-import-dialog";
import { buttonVariants } from "@/components/ui/button";
import { pdfFromExcelHref, reportImportExcelUrl } from "@/lib/export-excel-href";
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
          "gap-1.5 border-emerald-200/90 bg-emerald-50/90 text-emerald-900 shadow-sm hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-100 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/55 dark:hover:text-emerald-50"
        )}
      >
        <FileSpreadsheet
          className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
        تصدير Excel
      </Link>
      <Link
        href={pdfHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-1.5 border-rose-200/90 bg-rose-50/90 text-rose-900 shadow-sm hover:border-rose-300 hover:bg-rose-100 hover:text-rose-950 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-100 dark:hover:border-rose-700 dark:hover:bg-rose-900/50 dark:hover:text-rose-50"
        )}
      >
        <FileText
          className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400"
          aria-hidden
        />
        طباعة / PDF
      </Link>
      {importKind ? (
        <>
          <ReportExcelImportDialog importKind={importKind} />
          <label
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
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
            {busy ? "جاري الاستيراد…" : "استيراد سريع"}
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
