import { cn } from "@/lib/utils";

/** يظهر على صفحات التقارير — عدد الصفوف المعروضة بعد الفلاتر. */
export function ReportRecordsCount({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-lg font-medium tabular-nums text-black dark:text-zinc-100",
        className
      )}
      dir="rtl"
      role="status"
    >
      المعروض في الصفحة: {count} سجلًا
    </p>
  );
}
