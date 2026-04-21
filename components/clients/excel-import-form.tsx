"use client";

import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DynamicExcelImporter } from "@/components/import/dynamic-excel-importer";
import { buttonVariants } from "@/components/ui/button";
import { clientsImportTemplateHref } from "@/lib/export-excel-href";
import {
  REPORT_EXCEL_EXPORT_ICON_CLASS,
  REPORT_EXCEL_EXPORT_LINK_CLASS,
} from "@/lib/ui/report-export-import-classes";
import { cn } from "@/lib/utils";
import { CLIENTS_FLAT_IMPORT_FIELDS } from "@/lib/import/clients-flat-import-fields";

export function ExcelImportForm() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-4 rounded-xl border border-border/70 bg-card p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">
        ارفع ملف Excel أو CSV واضبط تطابق الأعمدة. يُنشأ كل صف كعميل B ويُسند
        إليك. للمتابعات المتعددة استخدم حقل JSON الاختياري أو استخدم{" "}
        <Link
          href="/reports/b"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          استيراد تقرير B
        </Link>{" "}
        من القالب الكامل.
      </p>
      <p>
        <Link
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
        </Link>
      </p>

      <DynamicExcelImporter
        title="استيراد عملاء"
        expectedFields={CLIENTS_FLAT_IMPORT_FIELDS}
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
