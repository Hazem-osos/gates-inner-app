"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DynamicExcelImporter } from "@/components/import/dynamic-excel-importer";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { CLIENTS_FLAT_IMPORT_FIELDS } from "@/lib/import/clients-flat-import-fields";
import type { ImportType } from "@/lib/import/excel-client-import";
import { cn } from "@/lib/utils";

type Props = {
  importType: ImportType;
  triggerLabel?: string;
  /** شارة قصيرة بجانب النص (مثل B، NB) */
  triggerBadge?: string;
  className?: string;
};

export function ClientsMappedImportDialog({
  importType,
  triggerLabel = "استيراد Excel",
  triggerBadge,
  className,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={cn("gap-1.5", className)}
        onClick={() => setOpen(true)}
      >
        {triggerBadge ? (
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded border border-white/35 bg-white/15 font-bold leading-none text-white",
              triggerBadge.length >= 2 ? "text-[8px]" : "text-[11px]"
            )}
            aria-hidden
          >
            {triggerBadge}
          </span>
        ) : null}
        {triggerLabel}
      </Button>

      <SimpleDialog
        open={open}
        onOpenChange={setOpen}
        title={
          importType === "not-b"
            ? "استيراد عملاء Not B"
            : "استيراد عملاء B"
        }
        contentClassName="max-w-[min(96vw,720px)] w-[min(96vw,720px)]"
        footer={null}
      >
        <div className="max-h-[min(85vh,900px)] overflow-y-auto pe-1">
          <DynamicExcelImporter
            title="تعيين الأعمدة ثم تأكيد الاستيراد"
            expectedFields={CLIENTS_FLAT_IMPORT_FIELDS}
            onImport={async (mappedData) => {
              const r = await fetch("/api/import/clients-mapped", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ importType, rows: mappedData }),
              });
              const j = (await r.json()) as {
                message?: string;
                imported?: number;
                skipped?: number;
                errors?: { row: number; reason: string }[];
                duplicates?: { name: string; phone: string }[];
              };
              if (!r.ok) {
                toast.error(j.message ?? "فشل الاستيراد");
                return;
              }
              const errTxt =
                j.errors?.length && j.errors.length > 0
                  ? ` — ملاحظات: ${j.errors
                      .slice(0, 5)
                      .map((e) => `صف ${e.row}: ${e.reason}`)
                      .join("؛ ")}`
                  : "";
              toast.success(
                `تم إنشاء ${j.imported ?? 0} عميلاً، تجاهل ${j.skipped ?? 0} مكرراً.${errTxt}`
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
