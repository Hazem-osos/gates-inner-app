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
