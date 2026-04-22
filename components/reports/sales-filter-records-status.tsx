import { ReportRecordsCount } from "@/components/reports/report-records-count";
import { cn } from "@/lib/utils";

/**
 * عدد السجلات + تنبيه واضح عند تفعيل فلتر مندوب مبيعات (تقرير B / Not B).
 * الرسالة بعرض العدد: حجم مضاعف عن النص السابق (text-2xl مقابل text-xs).
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
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        className
      )}
      dir="rtl"
    >
      <div className="shrink-0">
        <ReportRecordsCount count={count} />
      </div>
      <p
        className="min-w-0 text-center text-2xl font-semibold leading-snug text-destructive sm:max-w-[min(100%,42rem)] sm:py-0.5 sm:text-right"
        role="status"
        aria-live="polite"
      >
        فلتر مندوب المبيعات: «{activeSalesName}» — الأعداد والسجلات المعروضة في
        الصفحة (والجدول) مُرشّحة لهذا المندوب فقط.
      </p>
    </div>
  );
}
