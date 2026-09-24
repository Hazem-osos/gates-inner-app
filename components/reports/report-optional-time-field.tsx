"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reportBInput } from "@/lib/report-b-table-helpers";
import { cn } from "@/lib/utils";

export function ReportOptionalTimeField({
  valueHm,
  disabled,
  title = "الساعة اختيارية — اتركها فارغة إن لم تُرد تحديد وقت",
  onValueChange,
}: {
  /** ‎HH:mm‎ أو فارغ */
  valueHm: string;
  disabled?: boolean;
  title?: string;
  onValueChange: (hm: string) => void;
}) {
  const hm = /^\d{2}:\d{2}$/.test(valueHm) ? valueHm : "";

  return (
    <div className="flex items-center gap-1" dir="ltr">
      <Input
        type="time"
        step={60}
        value={hm}
        disabled={disabled}
        aria-label="الساعة (اختياري)"
        title={title}
        className={cn(reportBInput, "w-28 text-center")}
        onChange={(e) => onValueChange(e.target.value)}
      />
      {hm && !disabled ? (
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          className="shrink-0 text-muted-foreground"
          title="مسح الساعة"
          aria-label="مسح الساعة"
          onClick={() => onValueChange("")}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
