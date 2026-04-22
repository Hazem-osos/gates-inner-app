"use client";

import { FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ClientsDynamicExcelImport } from "@/components/import/clients-dynamic-excel-import";
import { buttonVariants } from "@/components/ui/button";
import { clientsImportTemplateHref } from "@/lib/export-excel-href";
import {
  REPORT_EXCEL_EXPORT_ICON_CLASS,
  REPORT_EXCEL_EXPORT_LINK_CLASS,
} from "@/lib/ui/report-export-import-classes";
import { cn } from "@/lib/utils";
export function ExcelImportForm() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-4 rounded-xl border border-border/70 bg-card p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">
        ارفع ملف Excel أو CSV — يُقترح تطابق الأعمدة تلقائياً. أضف أزواج متابعة
        «نص + تاريخ» بالزر بعد رفع الملف، أو استخدم عمود JSON قديم. يُنشأ كل صف
        كعميل B ويُسند إليك.
      </p>
      <p>
        <a
          href={clientsImportTemplateHref()}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "inline-flex",
            REPORT_EXCEL_EXPORT_LINK_CLASS
          )}
        >
          <FileSpreadsheet
            className={REPORT_EXCEL_EXPORT_ICON_CLASS}
            aria-hidden
          />
          تنزيل قالب Excel
        </a>
      </p>

      <ClientsDynamicExcelImport
        title="استيراد عملاء"
        onImport={async (mappedData) => {
          const r = await fetch("/api/import/clients-mapped", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ importType: "b", rows: mappedData }),
          });
          const j = (await r.json()) as {
            message?: string;
            imported?: number;
            skipped?: number;
            errors?: { row: number; reason: string }[];
          };
          if (!r.ok) {
            toast.error(j.message ?? "فشل الاستيراد");
            return;
          }
          toast.success(
            `تم إنشاء ${j.imported ?? 0} عميلاً، تجاهل ${j.skipped ?? 0} مكرراً.`
          );
          router.refresh();
        }}
      />
    </div>
  );
}
