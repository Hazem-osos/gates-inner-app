"use client";

import { useEffect, useState } from "react";

import { NEW_LEADS_REPORT_CLS_EMPTY } from "@/lib/data/new-leads-report";
import type { ClassificationRow } from "@/lib/data/classifications";

export function NewLeadsReportClassificationFilter({
  classifications,
  defaultSelectedIds,
  defaultIncludeEmpty,
}: {
  classifications: ClassificationRow[];
  defaultSelectedIds: string[];
  defaultIncludeEmpty: boolean;
}) {
  const selectionKey = [
    defaultIncludeEmpty ? "1" : "0",
    defaultSelectedIds.slice().sort().join("\n"),
  ].join("|");

  const [includeEmpty, setIncludeEmpty] = useState(defaultIncludeEmpty);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelectedIds)
  );

  useEffect(() => {
    setIncludeEmpty(defaultIncludeEmpty);
    setSelected(new Set(defaultSelectedIds));
  }, [selectionKey]);

  const toggleId = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const parts = [
    ...(includeEmpty ? [NEW_LEADS_REPORT_CLS_EMPTY] : []),
    ...[...selected].sort(),
  ];
  const clsValue = parts.join(",");

  return (
    <>
      <input type="hidden" name="cls" value={clsValue} />
      <div
        className="flex min-w-0 basis-full flex-col gap-1.5 sm:col-span-2 lg:col-span-3"
        dir="rtl"
      >
        <div className="flex flex-wrap items-center gap-x-1 gap-y-0">
          <span className="text-xs font-medium text-foreground">
            التصنيف (بطاقة العميل)
          </span>
          <span className="text-[0.65rem] leading-tight text-muted-foreground">
            (عدة خيارات — OR)
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-md border border-border/70 bg-background px-2 py-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 border-border/60 text-xs sm:border-e sm:pe-3">
            <input
              type="checkbox"
              className="size-3.5 shrink-0 rounded border-input accent-primary"
              checked={includeEmpty}
              onChange={(e) => setIncludeEmpty(e.target.checked)}
            />
            <span className="max-w-44">بدون تصنيف / غير مرتبط</span>
          </label>
          {classifications.map((c) => (
            <label
              key={c.id}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs"
            >
              <input
                type="checkbox"
                className="size-3.5 shrink-0 rounded border-input accent-primary"
                checked={selected.has(c.id)}
                onChange={() => toggleId(c.id)}
              />
              <span className="max-w-36 truncate" title={c.label}>
                {c.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
