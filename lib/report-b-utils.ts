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
  { hex: "#F9A825", key: "yellow" },
  { hex: "#1565C0", key: "blue" },
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

/** بداية يوم التقويم المحلي (مقارنة ISO من DB مع «اليوم» دون أخطاء UTC) */
export function startOfLocalCalendarDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** «متابعة تالية» = يوم التقويم المحلي = اليوم (للوحة/التصدير — يتسق مع passesNeglected) */
export function isNextFollowUpLocalCalendarToday(
  nextFollowUpAt: string | null | undefined
): boolean {
  const raw = (nextFollowUpAt ?? "").trim();
  if (!raw) return false;
  const nf = parseIsoDate(raw);
  if (!nf) return false;
  return startOfLocalCalendarDay(nf).getTime() === startOfToday().getTime();
}

/**
 * يحلّل تاريخ المتابعة (كامل ISO أو تاريخ بصيغة yyyy-MM-dd فقط) كيوم تقويم محلي
 * — يتفادى حقول <input type="date"> الفارغة بسبب صيغة غير مفهومة لـ new Date.
 */
export function parseIsoDate(iso: string | null | undefined): Date | null {
  if (iso == null) return null;
  const t = String(iso).trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, m, d] = t.split("-").map((x) => parseInt(x, 10));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
      return null;
    }
    const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
    if (Number.isNaN(dt.getTime())) return null;
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
      return null;
    }
    return dt;
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * يتحقق من «المتابعة التالية» قبل حفظ صف التقرير: إن وُجد تاريخ
 * يجب أن يكون بداية ذلك اليوم ≥ بداية اليوم الحالي (اليوم أو لاحقاً).
 */
export function validateNextFollowUpAtForRowSave(
  nextFollowUpAt: string | null | undefined
): { ok: true } | { ok: false; message: string } {
  const raw = (nextFollowUpAt ?? "").trim();
  if (!raw) return { ok: true };
  const nf = parseIsoDate(raw);
  if (!nf) {
    return {
      ok: false,
      message:
        "التاريخ في «المتابعة التالية» غير صالح. صححه ثم اضغط «حفظ الصف» مرة أخرى.",
    };
  }
  if (nf < startOfToday()) {
    return {
      ok: false,
      message:
        "لا يمكن الحفظ: تاريخ «المتابعة التالية» يجب أن يكون اليوم أو تاريخاً لاحقاً (غير مسموح بحفظ تاريخ سابق).",
    };
  }
  return { ok: true };
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

/**
 * مهمول = حقل «متابعة تالية» فقط: **فارغ**، أو **نص ليس بتاريخ صالح**، أو **يوم التقويم المحلي
 * قبل اليوم**. اليوم أو أي تاريخ لاحق → ليس مهمولاً.
 * (خانات المتابعة JSON لا تغيّر هذا الفلتر — العمود هو المرجع.)
 */
export function passesNeglected(row: ReportBFilterRow): boolean {
  const raw = (row.nextFollowUpAt ?? "").trim();
  if (!raw) return true;
  const nf = parseIsoDate(raw);
  if (!nf) return true;
  const day = startOfLocalCalendarDay(nf);
  return day < startOfToday();
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
