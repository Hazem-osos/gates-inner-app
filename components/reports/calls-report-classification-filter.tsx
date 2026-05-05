"use client";

import { useEffect, useState } from "react";

import type { ClassificationRow } from "@/lib/data/classifications";

export function CallsReportClassificationFilter({
  classifications,
  defaultSelectedIds,
}: {
  classifications: ClassificationRow[];
  defaultSelectedIds: string[];
}) {
  const selectionKey = defaultSelectedIds.slice().sort().join("\n");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelectedIds)
  );

  useEffect(() => {
    setSelected(new Set(defaultSelectedIds));
  }, [selectionKey]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clsValue = [...selected].sort().join(",");

  return (
    <>
      <input type="hidden" name="cls" value={clsValue} />
      <fieldset
        className="flex min-w-0 basis-full flex-col gap-1.5"
        dir="rtl"
      >
        <legend className="sr-only">تصنيف العميل</legend>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-0">
          <span className="text-xs font-medium text-foreground">
            تصنيف العميل
          </span>
          <span className="text-[0.65rem] leading-tight text-muted-foreground">
            (عدة خيارات — OR)
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-md border border-border/70 bg-background px-2 py-1.5">
          {classifications.map((c) => (
            <label
              key={c.id}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs"
            >
              <input
                type="checkbox"
                className="size-3.5 shrink-0 rounded border-input accent-primary"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
              />
              <span className="max-w-36 truncate" title={c.label}>
                {c.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
