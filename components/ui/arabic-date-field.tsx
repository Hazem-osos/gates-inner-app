"use client";

import { X } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { formatDateArabicLong } from "@/lib/date-arabic";
import { parseIsoDate } from "@/lib/report-b-utils";
import { cn } from "@/lib/utils";

export type ArabicDateFieldProps = {
  /** قيمة الحقل ‎yyyy-MM-dd‎ أو فارغ */
  valueYmd: string;
  onValueChange: (ymd: string) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  /** نسخة مدمجة للنماذج */
  compact?: boolean;
  /** عند ‎true‎ يُسمح بزر المسح */
  allowEmpty?: boolean;
  /** نص العرض عند عدم وجود تاريخ */
  emptyLabel?: string;
};

function isValidYmd(v: string): boolean {
  return Boolean(v?.trim()) && /^\d{4}-\d{2}-\d{2}$/.test(v.trim());
}

export function ArabicDateField({
  valueYmd,
  onValueChange,
  disabled,
  className,
  buttonClassName,
  compact = false,
  allowEmpty = true,
  emptyLabel = "اختر التاريخ",
}: ArabicDateFieldProps) {
  const inputValue = isValidYmd(valueYmd) ? valueYmd.trim() : "";

  const displayLabel = useMemo(() => {
    if (!inputValue) return emptyLabel;
    const parsed = parseIsoDate(inputValue);
    if (!parsed) return emptyLabel;
    return formatDateArabicLong(parsed);
  }, [inputValue, emptyLabel]);

  const triggerTitle =
    inputValue && displayLabel !== emptyLabel
      ? `${displayLabel} — اضغط لتغيير التاريخ`
      : "اضغط لاختيار التاريخ — لا يُحفظ شيء حتى تختار من المنتقي (قد يظهر اليوم مقترَحاً فقط)";

  const onNativeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange(e.target.value);
    },
    [onValueChange]
  );

  const onClearClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!allowEmpty || disabled) return;
      onValueChange("");
    },
    [allowEmpty, disabled, onValueChange]
  );

  const showClear = allowEmpty && Boolean(inputValue);

  return (
    <div
      className={cn("flex w-full min-w-0 items-stretch gap-0.5", className)}
    >
      <div
        className={cn(
          "relative flex min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-input bg-background shadow-sm",
          compact
            ? "min-h-7"
            : "min-h-8",
          !inputValue &&
            "border-dashed border-muted-foreground/45 bg-muted/20 dark:bg-muted/10",
          buttonClassName
        )}
      >
        <input
          type="date"
          disabled={disabled}
          value={inputValue}
          onChange={onNativeChange}
          title={triggerTitle}
          aria-label={triggerTitle}
          className={cn(
            "absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0",
            disabled && "cursor-not-allowed"
          )}
        />
        <span
          className={cn(
            "pointer-events-none relative z-0 mx-auto min-w-0 flex-1 select-none px-2 py-1 text-center font-semibold leading-snug wrap-break-word text-pretty",
            compact ? "text-[11px] leading-tight" : "text-xs sm:text-sm",
            !inputValue && "font-normal text-muted-foreground"
          )}
          aria-hidden
        >
          {displayLabel}
        </span>
      </div>
      {showClear ? (
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          disabled={disabled}
          className="shrink-0 border-dashed text-muted-foreground"
          title="مسح التاريخ"
          aria-label="مسح التاريخ"
          onClick={onClearClick}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
