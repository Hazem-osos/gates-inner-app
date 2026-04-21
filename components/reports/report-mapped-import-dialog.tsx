"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DynamicExcelImporter } from "@/components/import/dynamic-excel-importer";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { getReportImportExpectedFields } from "@/lib/import/report-import-expected-fields";
import { REPORT_EXCEL_IMPORT_SOLID_CLASS } from "@/lib/ui/report-export-import-classes";
import { cn } from "@/lib/utils";

type Props = {
  kind: string;
  className?: string;
  triggerLabel?: string;
};

function dialogTitleForKind(kind: string): string {
  switch (kind) {
    case "report-closed":
      return "استيراد العملاء المغلقين";
    case "report-won":
      return "استيراد عملاء تم البيع";
    case "warming":
      return "استيراد Warming";
    case "report-recommendations":
      return "استيراد توصيات الإدارة";
    case "report-calls":
      return "استيراد تقرير المكالمات";
    default:
      return "استيراد من Excel";
  }
}

/** استيراد تحديث صفوف التقرير بعد تعيين أعمدة (نفس مسار الواجهة لـ B/Not B مع `/api/import/mapped-rows`). */
export function ReportMappedImportDialog({
  kind,
  className,
  triggerLabel = "استيراد من Excel",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);

  const expectedFields = useMemo(
    () => getReportImportExpectedFields(kind),
    [kind]
  );

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={cn("gap-1.5", REPORT_EXCEL_IMPORT_SOLID_CLASS, className)}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>

      <SimpleDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setSession((k) => k + 1);
        }}
        title={dialogTitleForKind(kind)}
        contentClassName="max-w-[min(96vw,900px)] w-[min(96vw,900px)]"
        footer={null}
      >
        <div className="max-h-[min(85vh,900px)] overflow-y-auto pe-1">
          <DynamicExcelImporter
            key={session}
            title="تعيين الأعمدة ثم تأكيد الاستيراد"
            mappingHelpMode="report"
            expectedFields={expectedFields}
            onImport={async (mappedData) => {
              const r = await fetch("/api/import/mapped-rows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind, rows: mappedData }),
              });
              const j = (await r.json()) as {
                message?: string;
                updated?: number;
                processed?: number;
                errors?: string[];
              };
              if (!r.ok) {
                toast.error(j.message ?? "فشل الاستيراد");
                return;
              }
              const errTxt =
                j.errors?.length && j.errors.length > 0
                  ? ` — ${j.errors.slice(0, 3).join("؛ ")}`
                  : "";
              toast.success(
                `تم تحديث ${j.updated ?? 0} من ${j.processed ?? 0} صفاً.${errTxt}`
              );
              setOpen(false);
              router.refresh();
            }}
          />
        </div>
      </SimpleDialog>
    </>
  );
}
