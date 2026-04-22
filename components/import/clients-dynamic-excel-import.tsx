"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { buildClientsFlatImportFields } from "@/lib/import/clients-flat-import-fields";
import {
  MAX_FOLLOW_UP_SLOTS_EXCEL,
  maxFollowUpSlotIndexFromHeaders,
} from "@/lib/import/follow-up-slot-columns";
import { cn } from "@/lib/utils";

const DynamicExcelImporter = dynamic(
  () =>
    import("@/components/import/dynamic-excel-importer").then((m) => ({
      default: m.DynamicExcelImporter,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/15"
        role="status"
        aria-busy="true"
        aria-label="جاري تحميل أداة الاستيراد"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  }
);

type Props = {
  title?: string;
  className?: string;
  onImport: (mappedData: Record<string, unknown>[]) => void | Promise<void>;
};

/**
 * استيراد عملاء مع أزواج متابعة ديناميكية: اكتشاف من العناوين + زر إضافة متابعة.
 */
export function ClientsDynamicExcelImport({
  title = "استيراد عملاء",
  className,
  onImport,
}: Props) {
  const [followUpPairCount, setFollowUpPairCount] = useState(1);
  const [fileReady, setFileReady] = useState(false);

  const expectedFields = useMemo(
    () => buildClientsFlatImportFields(followUpPairCount),
    [followUpPairCount]
  );

  return (
    <div className={cn("space-y-3", className)}>
      <DynamicExcelImporter
        title={title}
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
            يُضاف زوج عمودين «نص + تاريخ» للربط. إن وُجدت في الملف عناوين مثل
            «متابعة ٢ — نص» يُوسَّع العدد تلقائياً.
          </p>
        </div>
      ) : null}
    </div>
  );
}
