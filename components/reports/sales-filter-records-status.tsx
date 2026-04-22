import { ReportRecordsCount } from "@/components/reports/report-records-count";
import { cn } from "@/lib/utils";

const SALES_FILTER_MESSAGE_CLASS =
  "min-w-0 w-full text-balance text-center text-base sm:text-lg font-semibold leading-relaxed text-destructive";

/** عند تفعيل فلترات أخرى دون اختيار مندوب محدد (نص موحّد + منتصف). */
export function GenericFilterActiveNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "w-full text-center text-xs sm:text-sm font-normal text-muted-foreground",
        className
      )}
      dir="rtl"
      role="status"
    >
      يوجد فلتر نشط على النتائج المعروضة.
    </p>
  );
}

/**
 * نص فلتر السيلز — سطر واضح، مميز (أحمر، خط أكبر).
 */
export function SalesFilterActiveMessage({
  activeSalesName,
  className,
}: {
  activeSalesName: string;
  className?: string;
}) {
  const line = `فلتر سيلز: «${activeSalesName}»`;
  return (
    <p
      className={cn(
        SALES_FILTER_MESSAGE_CLASS,
        "mx-auto",
        className
      )}
      dir="rtl"
      role="status"
      aria-live="polite"
    >
      {line}
    </p>
  );
}

/**
 * عدد السجلات + تنبيه فلتر السيلز (B / Not B) — يستدعي `SalesFilterActiveMessage` للنص القصير.
 */
export function SalesFilterRecordsStatus({
  count,
  activeSalesName,
  className,
}: {
  count: number;
  /** إن وُجد: يظهر فلتر سيلز على المندوب بالاسم */
  activeSalesName: string | null;
  className?: string;
}) {
  if (!activeSalesName) {
    return (
      <div className={className}>
        <ReportRecordsCount count={count} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 text-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-3 sm:gap-y-0.5",
        className
      )}
      dir="rtl"
    >
      <SalesFilterActiveMessage activeSalesName={activeSalesName} />
      <ReportRecordsCount
        count={count}
        className="text-sm font-normal text-foreground"
      />
    </div>
  );
}
