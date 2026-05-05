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
      <fieldset className="flex min-w-[min(100%,280px)] flex-col gap-2">
        <legend className="text-sm font-medium">تصنيف العميل</legend>
        <p className="text-xs text-muted-foreground">
          اختر تصنيفًا واحدًا أو أكثر — يُعرض العملاء ضمن أي من التصنيفات المحددة.
        </p>
        <div className="max-h-36 overflow-y-auto rounded-md border border-border/80 bg-background px-2 py-2">
          <div className="flex flex-col gap-2">
            {classifications.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-4 shrink-0 rounded border-input"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                />
                <span className="min-w-0">{c.label}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>
    </>
  );
}
