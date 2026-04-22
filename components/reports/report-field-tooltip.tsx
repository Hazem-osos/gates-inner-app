"use client";

import * as React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** ~٢–٢٥× حجم نص الخلية (تقريباً من text-xs) */
const PREVIEW_TEXT =
  "text-[1.35rem] leading-snug sm:text-[1.6rem] sm:leading-relaxed md:text-[1.75rem]";

type Props = {
  tooltip: string;
  children: React.ReactNode;
  className?: string;
  /**
   * ‎radix‎: معاينة كبيرة (أثقل في جداول ضخمة).
   * ‎native‎: ‎title‎ فقط — أخف بكثير عند الكتابة في تقارير B / Not B واللوحة.
   */
  preview?: "radix" | "native";
};

/**
 * معاينة المحتوى — نص كبير. يجب أن يكون child عنصراً واحداً.
 * يرتبط المُحفِّز بذات حقل الإدخال (وليس span) حتى يعمل التلميح عند التركيز والتمرير مثل تقرير B/Not B.
 */
export const ReportFieldTooltip = React.memo(function ReportFieldTooltip({
  tooltip,
  children,
  className,
  preview = "radix",
}: Props) {
  const only = React.Children.only(children);
  if (!React.isValidElement(only)) {
    return <>{children}</>;
  }
  const prevClass = (only.props as { className?: string }).className;

  if (preview === "native") {
    const trigger = React.cloneElement(only, {
      className: cn("block w-full min-w-0", className, prevClass),
      title: tooltip,
    } as { className?: string; title?: string });
    return trigger;
  }

  const trigger = React.cloneElement(only, {
    className: cn("block w-full min-w-0", className, prevClass),
  } as { className?: string });

  return (
    <Tooltip delayDuration={220}>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className={cn(
          PREVIEW_TEXT,
          "whitespace-pre-wrap break-words [word-break:break-word]"
        )}
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
});
