import { startOfToday } from "@/lib/report-b-utils";

export type ReportBFollowSlot = { order: number; note: string; date: string };

/** فئات Tailwind المشتركة لحقول جدول التقارير B / Not B */
export const reportBInput =
  "h-8 min-w-[6.5rem] border border-border/70 bg-background text-xs leading-snug [color-scheme:inherit] dark:border-border/55";
export const reportBTextarea =
  "min-h-[2rem] min-w-[7rem] max-h-[36rem] max-w-[min(100vw,42rem)] resize border border-border/70 bg-background text-xs leading-snug [color-scheme:inherit] dark:border-border/55";
export const reportBSelectTrigger =
  "h-8 min-w-[6.5rem] border border-border/70 text-xs dark:border-border/55";

export function normalizeFollowSlots(
  raw: unknown
): ReportBFollowSlot[] {
  if (!Array.isArray(raw)) return [];
  const out: ReportBFollowSlot[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as Record<string, unknown>;
    if (typeof item !== "object" || item === null) continue;
    out.push({
      order: typeof item.order === "number" ? item.order : i + 1,
      note: typeof item.note === "string" ? item.note : "",
      date: typeof item.date === "string" ? item.date : "",
    });
  }
  return out.sort((a, b) => a.order - b.order);
}

export function followSlotsToJson(slots: ReportBFollowSlot[]): unknown {
  return slots.map((s, i) => ({ ...s, order: i + 1 }));
}

/** يزيل المتابعات الفارغة من نهاية السجل قبل الحفظ في القاعدة */
export function trimTrailingEmptyFollowSlots(
  slots: ReportBFollowSlot[]
): ReportBFollowSlot[] {
  if (slots.length === 0) return [];
  let end = slots.length;
  while (
    end > 0 &&
    !(slots[end - 1]?.note ?? "").trim() &&
    !(slots[end - 1]?.date ?? "").trim()
  ) {
    end--;
  }
  return slots.slice(0, end).map((s, i) => ({
    ...s,
    order: i + 1,
  }));
}

export function mergedCallAndSituation(
  call: string | null,
  sit: string | null
): string {
  const a = (call ?? "").trim();
  const b = (sit ?? "").trim();
  if (!a && !b) return "";
  if (!a) return b;
  if (!b) return a;
  return `${a}\n---\n${b}`;
}

/** عند التمرير على الحقل يظهر نص التلميح بالمحتوى الكامل */
export function fullCellTooltip(value: string | null | undefined): string {
  const s = value ?? "";
  return s.trim() ? s : "— فارغ —";
}

export function splitCallAndSituation(combined: string): {
  callSummary: string;
  currentSituation: string;
} {
  const sep = "\n---\n";
  if (!combined.includes(sep)) {
    return { callSummary: combined, currentSituation: "" };
  }
  const [callSummary, ...rest] = combined.split(sep);
  return { callSummary, currentSituation: rest.join(sep) };
}

export function nextFollowUpMeetsGate(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d >= startOfToday();
}

export function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateInputToIso(date: string): string | null {
  if (!date) return null;
  const d = new Date(date + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
