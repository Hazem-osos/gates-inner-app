import { formatDateArabicLong } from "@/lib/date-arabic";

function formatYmdLong(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return formatDateArabicLong(d);
}

export function CallsReportScopeNotice({
  fromYmd,
  toYmd,
  scheduledLabel,
  salesLine,
  adQ,
  classificationLabels,
}: {
  fromYmd: string;
  toYmd: string;
  scheduledLabel: string;
  salesLine: string;
  adQ: string;
  classificationLabels: string[];
}) {
  const lines: string[] = [
    `العملاء المعروضون هم من أُدخلوا كعملاء جدد (تاريخ إنشاء البطاقة) بين ${formatYmdLong(fromYmd)} و ${formatYmdLong(toYmd)}.`,
    `فلتر المواعيد: ${scheduledLabel}.`,
    salesLine,
  ];

  if (adQ) {
    lines.push(`تصفية اسم الإعلان: النتائج تتضمن فقط من يظهر في حقل «اسم الإعلان» النص «${adQ}».`);
  }

  if (classificationLabels.length > 0) {
    lines.push(
      `تصفية التصنيف: يُعرض العملاء المنتمون إلى أي من التصنيفات التالية: ${classificationLabels.join("، ")}.`
    );
  }

  return (
    <div
      className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive shadow-sm"
      dir="rtl"
      role="region"
      aria-label="بيان نطاق التقرير"
    >
      <p className="font-semibold">بيان التقرير — ماذا يعرض؟</p>
      <ul className="mt-2 list-disc space-y-1.5 ps-5">
        {lines.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
