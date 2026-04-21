import { daysElapsedSinceContact } from "@/lib/days-elapsed";

/** حقول مطلوبة لفلاتر تقرير B فقط — يتوافق مع ReportBRow */
export type ReportBFilterRow = {
  initialCallDate: string | null;
  nextFollowUpAt: string | null;
  visitAppointmentDate: string | null;
  presentingEmployeeName: string | null;
  quotePrice: string | null;
  followUpSlots: unknown;
  company: string | null;
  phone: string;
  phone2: string | null;
  name: string;
};

/** ألوان تشبّع أعلى لتظهر بوضوح على الصف + شريط اختيار اللون */
export const REPORT_B_PALETTE = [
  { hex: "#C62828", key: "red" },
  { hex: "#1565C0", key: "blue" },
  { hex: "#2E7D32", key: "green" },
  { hex: "#F9A825", key: "yellow" },
] as const;

/** أنماط «لا يُرد» في نصوص المتابعات — مقارنة بدون حساسية لحالة الأحرف */
export const NO_RESPONSE_SNIPPETS = [
  "لم يرد",
  "مش بيرد",
  "ما بيردش",
  "لا يرد",
  "مش راد",
  "no answer",
  "no resp",
];

export type ViolationKind =
  | null
  | "days_over"
  | "follow_count"
  | "neglected"
  | "no_answer";

export type SortTriState = null | "asc" | "desc";

export function startOfToday(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** تطبيع مصفوفة المتابعات من JSON — للتصدير والفلاتر */
export function normalizeSlotsSimple(raw: unknown): { note: string; date: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const o = item as Record<string, unknown>;
    return {
      note: typeof o.note === "string" ? o.note : "",
      date: typeof o.date === "string" ? o.date : "",
    };
  });
}

export function slotsTextBlob(slotsJson: unknown): string {
  return JSON.stringify(slotsJson ?? []).toLowerCase();
}

export function passesNoAnswerFilter(slotsJson: unknown): boolean {
  const blob = slotsTextBlob(slotsJson);
  return NO_RESPONSE_SNIPPETS.some((s) => blob.includes(s.toLowerCase()));
}

/** زيارة متجاوزة: تاريخ الزيارة قبل اليوم وبدون موظف عرض */
export function passesVisitOverdue(row: ReportBFilterRow): boolean {
  const vd = parseIsoDate(row.visitAppointmentDate);
  if (!vd) return false;
  if (vd >= startOfToday()) return false;
  const emp = (row.presentingEmployeeName ?? "").trim();
  return emp.length === 0;
}

export function passesDaysOver(row: ReportBFilterRow, minDays: number): boolean {
  const days = daysElapsedSinceContact(
    row.initialCallDate ? new Date(row.initialCallDate) : null
  );
  if (days === null) return false;
  return days >= minDays;
}

export function passesFollowCount(row: ReportBFilterRow, minCount: number): boolean {
  const slots = normalizeSlotsSimple(row.followUpSlots);
  const n = slots.filter((s) => (s.note ?? "").trim().length > 0).length;
  return n >= minCount;
}

/** انتهى موعد المتابعة دون تسجيل متابعة لاحقة في الجدول */
export function passesNeglected(row: ReportBFilterRow): boolean {
  const nf = parseIsoDate(row.nextFollowUpAt);
  if (!nf || nf >= startOfToday()) return false;
  const slots = normalizeSlotsSimple(row.followUpSlots);
  const recorded = slots.some((s) => {
    const d = parseIsoDate(s.date || null);
    const note = (s.note ?? "").trim();
    if (!note || !d) return false;
    return d >= nf;
  });
  return !recorded;
}

export function passesVisitScheduledOnly(row: ReportBFilterRow): boolean {
  const v = row.visitAppointmentDate;
  if (v == null) return false;
  return String(v).trim().length > 0;
}

/** زيارة فعلية: موظف عرض + تاريخ زيارة */
export function passesActuallyVisited(row: ReportBFilterRow): boolean {
  const vd = (row.visitAppointmentDate ?? "").trim();
  const emp = (row.presentingEmployeeName ?? "").trim();
  return vd.length > 0 && emp.length > 0;
}

export function matchesSearch(row: ReportBFilterRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    row.company ?? "",
    row.phone ?? "",
    row.phone2 ?? "",
    row.name ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

function compareIdStable(a: { id: string }, b: { id: string }): number {
  return a.id.localeCompare(b.id);
}

export type ReportBSortColumnKey =
  | "days"
  | "quotePrice"
  | "initialCallDate"
  | "nextFollowUpAt";

export function sortRows<T extends ReportBFilterRow & { id: string }>(
  rows: T[],
  key: ReportBSortColumnKey,
  dir: Exclude<SortTriState, null>
): T[] {
  const mult = dir === "asc" ? 1 : -1;
  const copy = [...rows];
  copy.sort((a, b) => {
    let cmp = 0;
    if (key === "days") {
      const da =
        daysElapsedSinceContact(
          a.initialCallDate ? new Date(a.initialCallDate) : null
        ) ?? -1;
      const db =
        daysElapsedSinceContact(
          b.initialCallDate ? new Date(b.initialCallDate) : null
        ) ?? -1;
      cmp = (da - db) * mult;
    } else if (key === "quotePrice") {
      const pa = parseFloat(a.quotePrice ?? "") || 0;
      const pb = parseFloat(b.quotePrice ?? "") || 0;
      cmp = (pa - pb) * mult;
    } else if (key === "nextFollowUpAt") {
      const ta = parseIsoDate(a.nextFollowUpAt)?.getTime() ?? 0;
      const tb = parseIsoDate(b.nextFollowUpAt)?.getTime() ?? 0;
      cmp = (ta - tb) * mult;
    } else {
      const ta = parseIsoDate(a.initialCallDate)?.getTime() ?? 0;
      const tb = parseIsoDate(b.initialCallDate)?.getTime() ?? 0;
      cmp = (ta - tb) * mult;
    }
    if (cmp !== 0) return cmp;
    return compareIdStable(a, b);
  });
  return copy;
}
