"use client";

import { FileDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DynamicExcelImporter } from "@/components/import/dynamic-excel-importer";
import { buttonVariants } from "@/components/ui/button";
import { clientsImportTemplateHref } from "@/lib/export-excel-href";
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
            "inline-flex gap-1.5 border-teal-200/90 bg-teal-50/90 text-teal-900 shadow-sm hover:border-teal-300 hover:bg-teal-100 hover:text-teal-950 dark:border-teal-800 dark:bg-teal-950/45 dark:text-teal-100 dark:hover:border-teal-600 dark:hover:bg-teal-900/55 dark:hover:text-teal-50"
          )}
        >
          <FileDown
            className="size-3.5 shrink-0 text-teal-600 dark:text-teal-400"
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
