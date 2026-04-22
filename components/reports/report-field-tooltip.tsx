"use client";

import * as React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** تلميح واضح شوية من ‎text-sm‎ لكن بعيد عن الحجم الضخم السابق */
const RADIX_PREVIEW =
  "text-base leading-normal font-normal px-3 py-2 max-w-[min(92vw,32rem)]";
/** اسم قديم في بعض الفروع/الكاش — نفس الـ class */
const RADIX_MINIMAL = RADIX_PREVIEW;

type Props = {
  tooltip: string;
  children: React.ReactNode;
  className?: string;
  /**
   * ‎radix‎ (الافتراضي): تلميح ‎text-base‎ — أوضح شوية من غير تكبير مبالغ.
   * ‎native‎: ‎title‎ فقط من المتصفح (أصغر، أخف).
   */
  preview?: "radix" | "native";
};

/**
 * معاينة محتوى الخلية. الافتراضي: تلميح Radix بحجم مريح.
 * يرتبط المُحفِّز بذات حقل الإدخال حتى يعمل التلميح مع التركيز مثل تقرير B/Not B.
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
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className={cn(
          RADIX_MINIMAL,
          "whitespace-pre-wrap wrap-break-word [word-break:break-word]"
        )}
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
});
