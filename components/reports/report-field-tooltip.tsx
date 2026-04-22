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
};

/**
 * معاينة المحتوى — نص كبير. يجب أن يكون child عنصراً واحداً.
 * يرتبط المُحفِّز بذات حقل الإدخال (وليس span) حتى يعمل التلميح عند التركيز والتمرير مثل تقرير B/Not B.
 */
export function ReportFieldTooltip({
  tooltip,
  children,
  className,
}: Props) {
  const only = React.Children.only(children);
  if (!React.isValidElement(only)) {
    return <>{children}</>;
  }
  const prevClass = (only.props as { className?: string }).className;
  const trigger = React.cloneElement(only, {
    className: cn("block w-full min-w-0", className, prevClass),
  } as { className?: string });

  return (
    <Tooltip delayDuration={180}>
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
}
