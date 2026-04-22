import { ReportRecordsCount } from "@/components/reports/report-records-count";
import { cn } from "@/lib/utils";

const SALES_FILTER_MESSAGE_CLASS =
  "min-w-0 w-full max-w-3xl text-balance text-center text-base font-medium leading-relaxed text-destructive";

/** عند تفعيل فلترات أخرى دون اختيار مندوب محدد (نص موحّد + منتصف). */
export function GenericFilterActiveNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "w-full text-center text-base font-medium text-destructive",
        className
      )}
      dir="rtl"
      role="status"
    >
      يوجد فلتر نشط على النتائج المعروضة.
    </p>
  );
}

/** نص فلتر المندوب النشط (نفس الحجم في كل الصفحات) — بمحاذاة المنتصف. */
export function SalesFilterActiveMessage({
  activeSalesName,
  className,
}: {
  activeSalesName: string;
  className?: string;
}) {
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
      يوجد فلتر مندوب مبيعات باسم «{activeSalesName}» — الأعداد والسجلات المعروضة
      في الصفحة (والجدول) مُرشّحة لهذا المندوب فقط.
    </p>
  );
}

/**
 * عدد السجلات + تنبيه عند تفعيل فلتر مندوب مبيعات (تقرير B / Not B).
 * الرسالة في المنتصف تحت شريط الأدوات.
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
        "flex flex-col items-center gap-2 text-center",
        className
      )}
      dir="rtl"
    >
      <SalesFilterActiveMessage activeSalesName={activeSalesName} />
      <div className="shrink-0">
        <ReportRecordsCount count={count} />
      </div>
    </div>
  );
}
