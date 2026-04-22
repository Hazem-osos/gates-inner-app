import { ReportRecordsCount } from "@/components/reports/report-records-count";
import { cn } from "@/lib/utils";

/**
 * عدد السجلات + تنبيه عند تفعيل فلتر مندوب مبيعات (تقرير B / Not B).
 * الرسالة بمحاذاة اليمين (RTL) وخط أصغر من النسخة الأولى.
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
        "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className
      )}
      dir="rtl"
    >
      <p
        className="min-w-0 w-full text-balance text-right text-sm font-medium leading-relaxed text-destructive sm:max-w-[min(100%,40rem)] sm:text-end"
        role="status"
        aria-live="polite"
      >
        فلتر مندوب المبيعات: «{activeSalesName}» — الأعداد والسجلات المعروضة في
        الصفحة (والجدول) مُرشّحة لهذا المندوب فقط.
      </p>
      <div className="shrink-0 sm:order-last">
        <ReportRecordsCount count={count} />
      </div>
    </div>
  );
}
