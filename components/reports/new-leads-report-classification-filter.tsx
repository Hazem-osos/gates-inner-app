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
      <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
        <span className="text-xs text-muted-foreground">
          التصنيف (بطاقة العميل) — يمكن اختيار أكثر من تصنيف
        </span>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-input bg-background px-3 py-2">
          <label className="flex cursor-pointer items-center gap-2 border-b border-border/50 py-2 text-sm">
            <input
              type="checkbox"
              className="size-4 shrink-0 rounded border-input"
              checked={includeEmpty}
              onChange={(e) => setIncludeEmpty(e.target.checked)}
            />
            <span>بدون تصنيف من القائمة / غير مرتبط بعميل</span>
          </label>
          <div className="flex flex-col gap-2 pt-2">
            {classifications.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-4 shrink-0 rounded border-input"
                  checked={selected.has(c.id)}
                  onChange={() => toggleId(c.id)}
                />
                <span className="min-w-0">{c.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
