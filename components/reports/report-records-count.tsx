/** يظهر على صفحات التقارير — عدد الصفوف المعروضة بعد الفلاتر. */
export function ReportRecordsCount({ count }: { count: number }) {
  return (
    <p
      className="text-sm tabular-nums text-muted-foreground"
      dir="rtl"
      role="status"
    >
      المعروض في الصفحة:{" "}
      <span className="font-semibold text-foreground">{count}</span> سجلًا
    </p>
  );
}
