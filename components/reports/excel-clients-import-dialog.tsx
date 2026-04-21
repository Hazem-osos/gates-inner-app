"use client";

import { ClientsMappedImportDialog } from "@/components/import/clients-mapped-import-dialog";
import type { ImportType } from "@/lib/import/excel-client-import";
import { cn } from "@/lib/utils";

type Props = {
  importType: ImportType;
  className?: string;
};

/** استيراد عملاء جدد من Excel مع تعيين أعمدة تفاعلي */
export function ExcelClientsImportDialog({ importType, className }: Props) {
  return (
    <ClientsMappedImportDialog
      importType={importType}
      triggerBadge={importType === "not-b" ? "NB" : "B"}
      triggerLabel="استيراد من Excel"
      className={cn(
        "border-0 bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700",
        className
      )}
    />
  );
}
