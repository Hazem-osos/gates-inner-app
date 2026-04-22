/** يظهر على صفحات التقارير — عدد الصفوف المعروضة بعد الفلاتر. */
export function ReportRecordsCount({ count }: { count: number }) {
  return (
    <p
      className="text-lg font-medium tabular-nums text-black dark:text-zinc-100"
      dir="rtl"
      role="status"
    >
      المعروض في الصفحة: {count} سجلًا
    </p>
  );
}
