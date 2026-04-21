"use client";

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
 * معاينة المحتوى عند التمرير على حقول الجدول — نص كبير بدل تلميح المتصفح الصغير.
 */
export function ReportFieldTooltip({
  tooltip,
  children,
  className,
}: Props) {
  return (
    <Tooltip delayDuration={180}>
      <TooltipTrigger asChild>
        <span className={cn("block w-full min-w-0", className)}>
          {children}
        </span>
      </TooltipTrigger>
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
