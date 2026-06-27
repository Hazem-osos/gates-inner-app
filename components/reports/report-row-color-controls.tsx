"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  normalizeReportRowStyleColor,
  REPORT_ROW_STYLE_COLORS,
  type ReportRowStyleColorKey,
} from "@/lib/report-row-style-ui";
import { cn } from "@/lib/utils";

export function ReportRowColorControls({
  apiBasePath,
  rowStyle,
  disabled,
}: {
  /** مثل ‎`/api/new-leads/abc`‎ — يُكمَّل بـ ‎/row-style‎ */
  apiBasePath: string;
  rowStyle?: { color: string; legendNote: string };
  disabled?: boolean;
}) {
  const router = useRouter();
  const [colorBusy, startColor] = useTransition();
  const hasRowTint = Boolean(normalizeReportRowStyleColor(rowStyle?.color));
  const styleUrl = `${apiBasePath}/row-style`;

  const applyRowColor = useCallback(
    (color: ReportRowStyleColorKey) => {
      if (disabled) return;
      startColor(async () => {
        const res = await fetch(styleUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ color }),
        });
        if (res.ok) {
          router.refresh();
        } else {
          const j = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          toast.error(j.message ?? "تعذر حفظ اللون.");
        }
      });
    },
    [disabled, router, startColor, styleUrl]
  );

  const clearRowColor = useCallback(() => {
    if (disabled) return;
    startColor(async () => {
      const res = await fetch(styleUrl, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(j.message ?? "تعذر إزالة اللون.");
      }
    });
  }, [disabled, router, startColor, styleUrl]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {REPORT_ROW_STYLE_COLORS.map((c) => {
        const active = normalizeReportRowStyleColor(rowStyle?.color) === c;
        const sw =
          c === "red"
            ? "bg-red-500"
            : c === "yellow"
              ? "bg-amber-400"
              : "bg-blue-600";
        return (
          <button
            key={c}
            type="button"
            disabled={disabled || colorBusy}
            className={cn(
              "size-7 shrink-0 cursor-pointer rounded-full shadow-md",
              "motion-safe:transition-all motion-safe:duration-150",
              "focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "enabled:hover:z-20 enabled:hover:scale-[1.14] enabled:hover:shadow-lg",
              "enabled:hover:ring-2 enabled:hover:ring-primary enabled:hover:ring-offset-2 enabled:hover:ring-offset-background",
              "disabled:cursor-not-allowed disabled:opacity-50",
              sw,
              active
                ? "z-10 scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg"
                : "ring-0 ring-offset-0"
            )}
            title={
              c === "red"
                ? "تلوين أحمر"
                : c === "yellow"
                  ? "تلوين أصفر"
                  : "تلوين أزرق"
            }
            aria-label={
              c === "red"
                ? "تلوين الصف بالأحمر"
                : c === "yellow"
                  ? "تلوين الصف بالأصفر"
                  : "تلوين الصف بالأزرق"
            }
            onClick={(e) => {
              e.stopPropagation();
              applyRowColor(c);
            }}
          />
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 px-1.5 text-[10px] font-medium"
        disabled={disabled || colorBusy || !hasRowTint}
        title="إزالة تلوين الصف"
        onClick={(e) => {
          e.stopPropagation();
          clearRowColor();
        }}
      >
        بلا لون
      </Button>
    </div>
  );
}

export type ReportRowTintFilter = ReportRowStyleColorKey | "none" | null;

export function ReportRowTintFilterBar({
  rowTintFilter,
  onRowTintFilterChange,
}: {
  rowTintFilter: ReportRowTintFilter;
  onRowTintFilterChange: (v: ReportRowTintFilter) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-2"
      role="group"
      aria-label="تصفية حسب لون صف التقرير"
    >
      <span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
        لون الصف
      </span>
      <Button
        type="button"
        size="sm"
        variant={rowTintFilter === null ? "secondary" : "ghost"}
        className={cn(
          "h-8 rounded-lg px-2.5 text-xs",
          rowTintFilter === null &&
            "border border-border/80 bg-secondary font-semibold"
        )}
        onClick={() => onRowTintFilterChange(null)}
      >
        الكل
      </Button>
      <Button
        type="button"
        size="sm"
        variant={rowTintFilter === "none" ? "secondary" : "outline"}
        className={cn(
          "h-8 rounded-lg px-2.5 text-xs",
          rowTintFilter === "none" &&
            "border border-border/80 bg-secondary font-semibold"
        )}
        aria-pressed={rowTintFilter === "none"}
        title="صفوف بدون تلوين"
        onClick={() =>
          onRowTintFilterChange(rowTintFilter === "none" ? null : "none")
        }
      >
        بدون لون
      </Button>
      {REPORT_ROW_STYLE_COLORS.map((key) => {
        const active = rowTintFilter === key;
        const swatch =
          key === "red"
            ? "bg-red-500"
            : key === "yellow"
              ? "bg-yellow-400"
              : "bg-blue-600";
        const ringActive =
          "ring-2 ring-offset-2 ring-offset-card ring-foreground/70 dark:ring-offset-card";
        return (
          <Button
            key={key}
            type="button"
            size="icon-sm"
            variant="outline"
            title={
              key === "red" ? "أحمر" : key === "yellow" ? "أصفر" : "أزرق"
            }
            aria-pressed={active}
            className={cn(
              "size-8 shrink-0 rounded-full border-2 border-background p-0 shadow-sm",
              swatch,
              active ? ringActive : "opacity-90 hover:opacity-100"
            )}
            onClick={() =>
              onRowTintFilterChange(rowTintFilter === key ? null : key)
            }
          />
        );
      })}
    </div>
  );
}
