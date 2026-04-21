"use client";

import { useMemo, useState } from "react";

import { DynamicExcelImporter } from "@/components/import/dynamic-excel-importer";
import { Button } from "@/components/ui/button";
import { buildReportFlatImportFields } from "@/lib/import/report-flat-import-fields";
import {
  MAX_FOLLOW_UP_SLOTS_EXCEL,
  maxFollowUpSlotIndexFromHeaders,
} from "@/lib/import/follow-up-slot-columns";
import { cn } from "@/lib/utils";

type Props = {
  reportKind: string;
  title?: string;
  className?: string;
  onImport: (mappedData: Record<string, unknown>[]) => void | Promise<void>;
};

/**
 * استيراد تحديث صف تقرير (مغلق / مكالمات / …) مع أزواج متابعة ديناميكية مثل استيراد B/Not B.
 */
export function ReportDynamicExcelImport({
  reportKind,
  title = "تعيين الأعمدة ثم تأكيد الاستيراد",
  className,
  onImport,
}: Props) {
  const [followUpPairCount, setFollowUpPairCount] = useState(1);
  const [fileReady, setFileReady] = useState(false);

  const variant = reportKind === "report-won" ? "report-won" : undefined;

  const expectedFields = useMemo(
    () => buildReportFlatImportFields(followUpPairCount, { variant }),
    [followUpPairCount, variant]
  );

  return (
    <div className={cn("space-y-3", className)}>
      <DynamicExcelImporter
        title={title}
        mappingHelpMode="report"
        expectedFields={expectedFields}
        onHeadersParsed={(h) => {
          setFileReady(true);
          const m = maxFollowUpSlotIndexFromHeaders(h);
          if (m > 0) {
            setFollowUpPairCount((c) => Math.max(c, m));
          }
        }}
        onFileCleared={() => {
          setFileReady(false);
          setFollowUpPairCount(1);
        }}
        onImport={onImport}
      />
      {fileReady ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 font-semibold"
            disabled={followUpPairCount >= MAX_FOLLOW_UP_SLOTS_EXCEL}
            onClick={() =>
              setFollowUpPairCount((c) =>
                Math.min(c + 1, MAX_FOLLOW_UP_SLOTS_EXCEL)
              )
            }
          >
            + إضافة متابعة
          </Button>
          <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
            يُضاف زوج عمودين يطابق تصدير Excel («متابعة n — نص» و«متابعة n — تاريخ»)
            وأعمدة الجدول («متابعة n» / «تاريخ n»). إن وُجدت في الملف عناوين
            متابعات إضافية يُوسَّع العدد تلقائياً.
          </p>
        </div>
      ) : null}
    </div>
  );
}
