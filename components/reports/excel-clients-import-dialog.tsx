"use client";

import { ClientsMappedImportDialog } from "@/components/import/clients-mapped-import-dialog";
import type { ImportType } from "@/lib/import/excel-client-import";
import { REPORT_EXCEL_IMPORT_SOLID_CLASS } from "@/lib/ui/report-export-import-classes";
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
      triggerLabel="استيراد من Excel"
      className={cn(REPORT_EXCEL_IMPORT_SOLID_CLASS, className)}
    />
  );
}
