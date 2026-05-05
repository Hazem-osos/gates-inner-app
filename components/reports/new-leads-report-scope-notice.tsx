import { formatDateArabicLong } from "@/lib/date-arabic";
import { NEW_LEADS_REPORT_REACH_NOT_REACHED_EXCL_EXPIRED } from "@/lib/data/new-leads-report";

function formatYmdLong(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return formatDateArabicLong(d);
}

function reachLabel(reach: string): string {
  if (reach === "NOT_REACHED") return "لم يتم الوصول فقط";
  if (reach === NEW_LEADS_REPORT_REACH_NOT_REACHED_EXCL_EXPIRED) {
    return "لم يتم الوصول مع استبعاد من عُيّن زر «Expired»";
  }
  if (reach === "REACHED") return "تم الوصول فقط";
  return "كل حالات الوصول";
}

export function NewLeadsReportScopeNotice({
  fromYmd,
  toYmd,
  salesLine,
  adQ,
  phoneQ,
  reach,
  classificationLines,
}: {
  fromYmd: string;
  toYmd: string;
  salesLine: string;
  adQ: string;
  phoneQ: string;
  reach: string;
  classificationLines: string[];
}) {
  const lines: string[] = [
    `Leads المعروضة مسجّلة في أيام العمل (حقل يوم الإدخال على اللوحة) بين ${formatYmdLong(
      fromYmd
    )} و ${formatYmdLong(toYmd)}.`,
    salesLine,
    `حالة التواصل مع الليد: ${reachLabel(reach)}.`,
  ];

  if (adQ) {
    lines.push(`الإعلان: عرض الليدات التي يحتوي فيها حقل الإعلان على «${adQ}».`);
  }
  if (phoneQ) {
    lines.push(`الهاتف: عرض الليدات التي يحتوي رقمها على «${phoneQ}».`);
  }

  if (classificationLines.length > 0) {
    lines.push(...classificationLines);
  } else {
    lines.push("التصنيف: لا يوجد فرز بتصنيف بطاقة العميل — كل التصنيفات (حسب بقية الفلاتر).");
  }

  return (
    <div
      className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive shadow-sm"
      dir="rtl"
      role="region"
      aria-label="بيان نطاق تقرير Leads جديدة"
    >
      <p className="font-semibold">بيان التقرير — ماذا يعرض؟</p>
      <ul className="mt-2 list-disc space-y-1.5 ps-5">
        {lines.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
