import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  excelHref?: string;
  pdfHref?: string;
  importHref?: string;
  className?: string;
};

export function DataPageToolbar({
  excelHref,
  pdfHref,
  importHref,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-3",
        className
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">بيانات:</span>
      {excelHref ? (
        <Link
          href={excelHref}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8")}
        >
          تصدير Excel
        </Link>
      ) : null}
      {pdfHref ? (
        <Link
          href={pdfHref}
          title="يوضّح أن التصدير الأساسي عبر Excel من التقرير"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8")}
        >
          تصدير PDF
        </Link>
      ) : null}
      {importHref ? (
        <Link
          href={importHref}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "h-8")}
        >
          استيراد Excel
        </Link>
      ) : null}
    </div>
  );
}
