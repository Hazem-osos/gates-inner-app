"use client";

import { Palette } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  type RowColorLegendLabels,
  readLegendLabelsFromStorage,
  writeLegendLabelsToStorage,
} from "@/lib/report-row-color-legend-storage";
import type { ReportRowStyleColorKey } from "@/lib/report-row-style-ui";

const SWATCH: Record<ReportRowStyleColorKey, string> = {
  red: "bg-red-500",
  yellow: "bg-amber-400",
  green: "bg-emerald-500",
};

const LABEL_AR: Record<ReportRowStyleColorKey, string> = {
  red: "أحمر",
  yellow: "أصفر",
  green: "أخضر",
};

export function ReportBRowColorLegendPanel({
  reportKey,
}: {
  reportKey: string;
}) {
  const [labels, setLabels] = useState<RowColorLegendLabels>({
    red: "",
    yellow: "",
    green: "",
  });
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLabels(readLegendLabelsFromStorage(reportKey));
  }, [reportKey]);

  const scheduleSave = useCallback(
    (next: RowColorLegendLabels) => {
      if (saveT.current) clearTimeout(saveT.current);
      saveT.current = setTimeout(() => {
        saveT.current = null;
        writeLegendLabelsToStorage(reportKey, next);
      }, 320);
    },
    [reportKey]
  );

  useEffect(() => {
    return () => {
      if (saveT.current) clearTimeout(saveT.current);
    };
  }, []);

  const patch = (key: ReportRowStyleColorKey, value: string) => {
    setLabels((prev) => {
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  };

  return (
    <div
      className="min-w-0 flex-1 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-background shadow-sm dark:from-primary/10 dark:via-background"
      dir="rtl"
    >
      <div className="flex items-start gap-3 border-b border-primary/15 px-4 py-3">
        <span
          className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-inner dark:bg-primary/20"
          aria-hidden
        >
          <Palette className="size-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-base font-semibold leading-tight text-foreground">
            تلوين الصفوف
          </p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            اكتب معنى كل لون، ثم من عمود «إجراءات» اضغط على الدائرة المناسبة
            لتلوين الصف. يُحفظ اللون في النظام فور الاختيار، ويُرفق نص المعنى
            الحالي لهذا اللون إن وُجد.
          </p>
        </div>
      </div>
      <div className="space-y-2.5 p-3">
        {(Object.keys(SWATCH) as ReportRowStyleColorKey[]).map((k) => (
          <div key={k} className="flex items-center gap-2 sm:gap-3">
            <span
              className={cn(
                "size-8 shrink-0 rounded-lg shadow-inner ring-2 ring-black/10 dark:ring-white/15",
                SWATCH[k]
              )}
              title={LABEL_AR[k]}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <span className="mb-1 block text-[0.65rem] font-medium text-muted-foreground">
                معنى اللون ({LABEL_AR[k]})
              </span>
              <Input
                value={labels[k]}
                onChange={(e) => patch(k, e.target.value)}
                placeholder={`مثال: ${LABEL_AR[k]} — …`}
                className="h-9 text-sm"
                dir="rtl"
              />
            </div>
          </div>
        ))}
        <p className="text-[0.65rem] leading-snug text-muted-foreground">
          ملاحظات المعنى تُخزَّن في هذا المتصفح؛ التلوين الفعلي للصفوف يُحفظ
          في الحساب لكل تقرير.
        </p>
      </div>
    </div>
  );
}
