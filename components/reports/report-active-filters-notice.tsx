/** يظهر فقط عند تمرير ‎lines‎ — تنبيه أحمر بقائمة الفلاتر المطبّقة */
export function ReportActiveFiltersNotice({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive shadow-sm"
      dir="rtl"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">
        يوجد فلتر نشط — النتائج مصفّاة حسب التالي:
      </p>
      <ul className="mt-2 list-disc space-y-1.5 ps-5">
        {lines.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
