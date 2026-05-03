import type { CSSProperties } from "react";

export type ReportRowStyleTableType = "b" | "not-b" | "closed";

/** مفتاح ‎ReportRowStyle.reportKey‎ حسب نوع الجدول */
export function reportStyleDbKeyFromTableType(
  t: ReportRowStyleTableType
): string {
  if (t === "b") return "report-b";
  if (t === "not-b") return "report-not-b";
  return "report-closed";
}

/** قيمة ‎reportType‎ لـ ‎PATCH /api/clients/[id]/row-style‎ */
export function reportStyleApiTypeFromTableType(
  t: ReportRowStyleTableType
): string {
  if (t === "b") return "b";
  if (t === "not-b") return "not-b";
  return "closed";
}

export const REPORT_ROW_STYLE_COLORS = ["red", "yellow", "green"] as const;
export type ReportRowStyleColorKey = (typeof REPORT_ROW_STYLE_COLORS)[number];

export function normalizeReportRowStyleColor(
  raw: string | null | undefined
): ReportRowStyleColorKey | null {
  const k = (raw ?? "").trim().toLowerCase();
  if (k === "red" || k === "yellow" || k === "green") return k;
  return null;
}

/** خلفية خفيفة لعرض ‎<tr>‎ — الخلايا تستخدم ‎bg-inherit‎ حيث يلزم */
export function reportRowTintStyle(
  colorRaw: string | null | undefined,
  opts?: { focused?: boolean }
): CSSProperties | undefined {
  const color = normalizeReportRowStyleColor(colorRaw);
  const rgba: Record<ReportRowStyleColorKey, string> = {
    red: "rgba(239, 68, 68, 0.085)",
    yellow: "rgba(234, 179, 8, 0.11)",
    green: "rgba(34, 197, 94, 0.085)",
  };
  const focusRgba = "rgba(16, 185, 129, 0.11)";
  const base: CSSProperties = color
    ? { backgroundColor: rgba[color] }
    : {};
  if (opts?.focused) {
    return {
      ...base,
      boxShadow: `inset 0 0 0 9999px ${focusRgba}`,
    };
  }
  return Object.keys(base).length ? base : undefined;
}
