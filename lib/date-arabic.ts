const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

/** عرض تاريخ بالعربية، مثل: ١٥ أبريل ٢٠٢٦ */
export function formatDateArabicLong(d: Date): string {
  const day = d.getDate();
  const month = MONTHS_AR[d.getMonth()];
  const year = d.getFullYear();
  try {
    const nf = new Intl.NumberFormat("ar-EG");
    return `${nf.format(day)} ${month} ${nf.format(year)}`;
  } catch {
    return `${day} ${month} ${year}`;
  }
}

export function todayInputDate(): string {
  const t = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

/**
 * تاريخ فقط (yyyy-MM-dd) للتصدير Excel / PDF — بدون وقت.
 * يستخدم التقويم المحلي ليتوافق مع العرض اليومي.
 */
export function formatExportDateOnly(
  value: Date | string | null | undefined
): string {
  if (value === null || value === undefined || value === "") return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** تاريخ + وقت بصيغة عربية */
export function formatDateTimeArabic(d: Date): string {
  const datePart = formatDateArabicLong(d);
  try {
    const nf = new Intl.NumberFormat("ar-EG");
    const h = d.getHours();
    const m = d.getMinutes();
    return `${datePart}، ${nf.format(h)}:${String(m).padStart(2, "0")}`;
  } catch {
    return `${datePart}`;
  }
}
