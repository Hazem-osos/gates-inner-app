"use client";

import { X } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  /** نص مساعد للوصولية عند عدم وجود تاريخ */
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

  const arabicSummary = useMemo(() => {
    if (!inputValue) return null;
    const parsed = parseIsoDate(inputValue);
    if (!parsed) return null;
    return formatDateArabicLong(parsed);
  }, [inputValue]);

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
    <div className={cn("flex w-full min-w-0 items-start gap-1", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Input
          type="date"
          disabled={disabled}
          value={inputValue}
          onChange={onNativeChange}
          title={arabicSummary ?? undefined}
          aria-label={inputValue ? arabicSummary ?? emptyLabel : emptyLabel}
          className={cn(
            "scheme-light dark:scheme-dark",
            compact && "h-7 py-0 text-xs",
            buttonClassName
          )}
        />
        {arabicSummary ? (
          <p
            className={cn(
              "px-0.5 text-center leading-tight text-muted-foreground",
              compact ? "text-[10px]" : "text-[11px] md:text-xs"
            )}
            dir="rtl"
          >
            {arabicSummary}
          </p>
        ) : null}
      </div>
      {showClear ? (
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          disabled={disabled}
          className="shrink-0 text-muted-foreground"
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
