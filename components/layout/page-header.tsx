import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** خلفية شريط العنوان الافتراضية — يُستخدم مع الحدود في المكوّن */
export const CRM_FULL_WIDTH_HEADER_BAR =
  "bg-linear-to-b from-white to-zinc-50/95 shadow-[0_1px_2px_rgba(15,23,42,0.05)]";

type Props = {
  title: string;
  subtitle?: ReactNode;
  className?: string;
  /** شريط عناوين بعرض الصفحة بالكامل */
  fullWidthBar?: boolean;
  /** يُدمج فوق الافتراضي الفاتح — استخدمه فقط لتعديلات طفيفة */
  barClassName?: string;
};

export function PageHeader({
  title,
  subtitle,
  className,
  fullWidthBar,
  barClassName,
}: Props) {
  if (fullWidthBar) {
    return (
      <div className={cn("-mx-4 mb-8 w-[calc(100%+2rem)] max-w-none", className)}>
        <div
          className={cn(
            "w-full border-y border-zinc-200/90 py-6 text-center",
            CRM_FULL_WIDTH_HEADER_BAR,
            barClassName
          )}
        >
          <div className="mx-auto max-w-5xl px-4">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <div className="page-header-subtitle mt-2 text-sm leading-relaxed text-zinc-600">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mb-8 flex flex-col items-center justify-center gap-1 text-center ${className ?? ""}`}
    >
      <div className="w-full max-w-3xl rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-4 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <div className="mt-2 text-sm text-zinc-600">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
