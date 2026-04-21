"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DynamicExcelImporter } from "@/components/import/dynamic-excel-importer";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { REPORT_EXCEL_IMPORT_SOLID_CLASS } from "@/lib/ui/report-export-import-classes";
import { cn } from "@/lib/utils";
import { getReportImportExpectedFields } from "@/lib/import/report-import-expected-fields";

type Props = {
  importKind: string;
  triggerClassName?: string;
};

export function ReportExcelImportDialog({
  importKind,
  triggerClassName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fields = getReportImportExpectedFields(importKind);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={cn(REPORT_EXCEL_IMPORT_SOLID_CLASS, triggerClassName)}
        onClick={() => setOpen(true)}
      >
        استيراد (تعيين أعمدة)
      </Button>

      <SimpleDialog
        open={open}
        onOpenChange={setOpen}
        title="استيراد Excel"
        closeOnBackdrop={!busy}
        closeOnEscape={!busy}
        contentClassName="max-w-[min(96vw,720px)] w-[min(96vw,720px)]"
        footer={null}
      >
        <div className="max-h-[min(85vh,900px)] overflow-y-auto pe-1">
          <DynamicExcelImporter
            title="ارفع الملف واضبط التطابق ثم أكّد"
            expectedFields={fields}
            onImport={async (mappedData) => {
              setBusy(true);
              try {
                const r = await fetch("/api/import/mapped-rows", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    kind: importKind,
                    rows: mappedData,
                  }),
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
                const errs = j.errors?.length
                  ? j.errors.slice(0, 5).join(" — ")
                  : "";
                toast.success(
                  `تم تحديث ${j.updated ?? 0} من ${j.processed ?? 0} صفًا.${
                    errs ? ` ${errs}` : ""
                  }`
                );
                setOpen(false);
                router.refresh();
              } catch {
                toast.error("فشل الاستيراد");
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      </SimpleDialog>
    </>
  );
}
