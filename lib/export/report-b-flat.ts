import type { ReportClientPatchInput } from "@/app/actions/report-client-patch";
import type { ReportBRow } from "@/components/reports/report-b-table";
import { parseExcelDateCell } from "@/lib/import/excel-client-import";
import {
  MAX_FOLLOW_UP_SLOTS_EXCEL,
  followUpSlotDateHeaderAliases,
  followUpSlotDateHeaderAr,
  followUpSlotDateKey,
  followUpSlotNoteHeaderAliases,
  followUpSlotNoteHeaderAr,
  followUpSlotNoteKey,
} from "@/lib/import/follow-up-slot-columns";
import { normalizeSlotsSimple } from "@/lib/report-b-utils";

const REPORT_B_EXPORT_BASE_KEYS = [
  "name",
  "phone",
  "phone2",
  "company",
  "position",
  "address",
  "activity",
  "status",
  "initialCallDate",
  "nextFollowUpAt",
  "quotePrice",
  "quoteDetail",
  "managementRecommendationText",
  "managementRecommendationDate",
  "callSummary",
  "currentSituation",
  "salesNotes",
  "finalStatusNote",
  "clientWarmingText",
  "adPlatform",
  "sourceAdName",
  "visitAppointmentScheduled",
  "visitAppointmentDate",
  "presentingEmployeeName",
  "qqAnswer",
  "classificationId",
  "classificationLabel",
  "assignedUserName",
  "closedLostAt",
  "lossReason",
] as const;

function buildFollowUpSlotExportKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= MAX_FOLLOW_UP_SLOTS_EXCEL; i++) {
    keys.push(followUpSlotNoteKey(i), followUpSlotDateKey(i));
  }
  return keys;
}

/** مفاتيح أعمدة Excel (تصدير/استيراد) — صف واحد = عميل واحد — متابعات كأعمدة نص/تاريخ لكل خانة */
export const REPORT_B_EXPORT_KEYS: readonly string[] = [
  ...REPORT_B_EXPORT_BASE_KEYS,
  ...buildFollowUpSlotExportKeys(),
];

export type ReportBExportKey = (typeof REPORT_B_EXPORT_KEYS)[number];

const REPORT_B_EXPORT_HEADER_AR_BASE: Record<
  (typeof REPORT_B_EXPORT_BASE_KEYS)[number],
  string
> = {
  name: "اسم المسئول",
  phone: "هاتف",
  phone2: "هاتف ثاني",
  company: "شركة",
  position: "وظيفة",
  address: "عنوان",
  activity: "نشاط",
  status: "حالة",
  initialCallDate: "تاريخ اتصال",
  nextFollowUpAt: "متابعة تالية",
  quotePrice: "عرض سعر",
  quoteDetail: "تفصيل السعر",
  managementRecommendationText: "توصيات الإدارة",
  managementRecommendationDate: "تاريخ التوصية",
  callSummary: "ملخص مكالمة",
  currentSituation: "الموقف",
  salesNotes: "ملاحظات سيلز",
  finalStatusNote: "موقف نهائي",
  clientWarmingText: "أدوات Warming",
  adPlatform: "منصة",
  sourceAdName: "إعلان",
  visitAppointmentScheduled: "زيارة مجدولة",
  visitAppointmentDate: "تاريخ زيارة",
  presentingEmployeeName: "موظف عرض",
  qqAnswer: "QQ",
  classificationId: "معرف تصنيف",
  classificationLabel: "اسم التصنيف",
  assignedUserName: "سيلز",
  closedLostAt: "تاريخ الإغلاق",
  lossReason: "سبب الإغلاق",
};

function buildReportBExportHeaderAr(): Record<string, string> {
  const h: Record<string, string> = { ...REPORT_B_EXPORT_HEADER_AR_BASE };
  for (let i = 1; i <= MAX_FOLLOW_UP_SLOTS_EXCEL; i++) {
    h[followUpSlotNoteKey(i)] = followUpSlotNoteHeaderAr(i);
    h[followUpSlotDateKey(i)] = followUpSlotDateHeaderAr(i);
  }
  return h;
}

/** عناوين أعمدة التصدير (Excel / PDF) — تطابق واجهة التقرير */
export const REPORT_B_EXPORT_HEADER_AR: Record<string, string> =
  buildReportBExportHeaderAr();

function boolToCell(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  return v ? "true" : "false";
}

export function reportBRowToExportRecord(r: ReportBRow): Record<string, string> {
  const slots = normalizeSlotsSimple(r.followUpSlots);
  const byKey: Record<string, string> = {
    name: r.name,
    phone: r.phone,
    phone2: r.phone2 ?? "",
    company: r.company ?? "",
    position: r.position ?? "",
    address: r.address ?? "",
    activity: r.activity ?? "",
    status: r.status,
    initialCallDate: r.initialCallDate ?? "",
    nextFollowUpAt: r.nextFollowUpAt ?? "",
    quotePrice: r.quotePrice ?? "",
    quoteDetail: r.quoteDetail ?? "",
    managementRecommendationText: r.managementRecommendationText ?? "",
    managementRecommendationDate: r.managementRecommendationDate ?? "",
    callSummary: r.callSummary ?? "",
    currentSituation: r.currentSituation ?? "",
    salesNotes: r.salesNotes ?? "",
    finalStatusNote: r.finalStatusNote ?? "",
    clientWarmingText: r.clientWarmingText ?? "",
    adPlatform: r.adPlatform ?? "",
    sourceAdName: r.sourceAdName ?? "",
    visitAppointmentScheduled: boolToCell(r.visitAppointmentScheduled),
    visitAppointmentDate: r.visitAppointmentDate ?? "",
    presentingEmployeeName: r.presentingEmployeeName ?? "",
    qqAnswer: boolToCell(r.qqAnswer),
    classificationId: r.classificationId ?? "",
    classificationLabel: r.classificationLabel ?? "",
    assignedUserName: r.assignedUserName ?? "",
    closedLostAt: r.closedLostAt ?? "",
    lossReason: r.lossReason ?? "",
  };

  for (let i = 1; i <= MAX_FOLLOW_UP_SLOTS_EXCEL; i++) {
    const s = slots[i - 1];
    byKey[followUpSlotNoteKey(i)] = s?.note ?? "";
    byKey[followUpSlotDateKey(i)] = s?.date ?? "";
  }

  const out: Record<string, string> = {};
  for (const k of REPORT_B_EXPORT_KEYS) {
    const header = REPORT_B_EXPORT_HEADER_AR[k];
    if (header) out[header] = byKey[k] ?? "";
  }
  return out;
}

function cellStr(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    if (!(k in row)) continue;
    const v = row[k];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s !== "") return s;
  }
  return "";
}

function cellStrAllowEmpty(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    if (!(k in row)) continue;
    const v = row[k];
    if (v === undefined || v === null) return "";
    return String(v);
  }
  return undefined;
}

function parseBoolCell(v: string): boolean | null | undefined {
  const t = v.trim().toLowerCase();
  if (t === "" || t === "__none__") return undefined;
  if (t === "true" || t === "yes" || t === "1" || t === "نعم") return true;
  if (t === "false" || t === "no" || t === "0" || t === "لا") return false;
  if (t === "null") return null;
  return undefined;
}

function assignStr(
  patch: ReportClientPatchInput,
  key: keyof ReportClientPatchInput,
  row: Record<string, unknown>,
  keys: string[],
  opts?: { allowEmpty?: boolean }
) {
  const raw = cellStrAllowEmpty(row, keys);
  if (raw === undefined) return;
  const t = raw.trim();
  if (t === "" && !opts?.allowEmpty) return;
  (patch as Record<string, unknown>)[key as string] = t === "" ? null : t;
}

function rowHasAnySlotColumnKey(row: Record<string, unknown>): boolean {
  for (let i = 1; i <= MAX_FOLLOW_UP_SLOTS_EXCEL; i++) {
    if (followUpSlotNoteKey(i) in row) return true;
    if (followUpSlotDateKey(i) in row) return true;
    if (followUpSlotNoteHeaderAr(i) in row) return true;
    if (followUpSlotDateHeaderAr(i) in row) return true;
  }
  return false;
}

function rowHasFollowUpColumn(row: Record<string, unknown>): boolean {
  if ("followUpSlots" in row || "متابعات" in row) return true;
  return rowHasAnySlotColumnKey(row);
}

function slotDateIsoFromRow(row: Record<string, unknown>, i: number): string {
  const keys = [followUpSlotDateKey(i), ...followUpSlotDateHeaderAliases(i)];
  for (const k of keys) {
    if (!(k in row)) continue;
    const v = row[k];
    const d = parseExcelDateCell(v);
    if (d) return d.toISOString();
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function slotsFromColumns(row: Record<string, unknown>): {
  order: number;
  note: string;
  date: string;
}[] {
  const out: { order: number; note: string; date: string }[] = [];
  for (let i = 1; i <= MAX_FOLLOW_UP_SLOTS_EXCEL; i++) {
    const note = cellStr(row, [
      followUpSlotNoteKey(i),
      ...followUpSlotNoteHeaderAliases(i),
    ]);
    const date = slotDateIsoFromRow(row, i);
    if (!note.trim() && !date.trim()) continue;
    out.push({
      order: out.length + 1,
      note: note.trim(),
      date: date.trim(),
    });
  }
  return out;
}

function parseFollowUpSlotsForReportPatch(
  row: Record<string, unknown>
): unknown | undefined {
  if (!rowHasFollowUpColumn(row)) return undefined;
  const fromCols = slotsFromColumns(row);
  if (fromCols.length > 0) return fromCols;
  const legacy = cellStrAllowEmpty(row, ["followUpSlots", "متابعات"]);
  if (legacy !== undefined) {
    const t = legacy.trim();
    if (t === "") return [];
    try {
      const p = JSON.parse(t) as unknown;
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  if (rowHasAnySlotColumnKey(row)) return [];
  return undefined;
}

/**
 * يحوّل صف Excel (بعد sheet_to_json) إلى معرّف عميل + patch للحقول القابلة للتحديث من التقرير.
 * يُحدَّث الحقل فقط إذا وُجد عمود مطابق في الملف (استيراد جزئي عند حذف أعمدة من القالب).
 */
export function excelRowToReportClientPatch(
  row: Record<string, unknown>
): { clientId: string; patch: ReportClientPatchInput } | null {
  const clientId = cellStr(row, [
    "id",
    "معرف",
    "client_id",
    "معرف_العميل",
  ]);
  if (!clientId) return null;

  const patch: ReportClientPatchInput = {};

  assignStr(patch, "name", row, [
    "name",
    "الاسم",
    REPORT_B_EXPORT_HEADER_AR_BASE.name,
  ]);
  assignStr(patch, "phone", row, ["phone", "الهاتف", REPORT_B_EXPORT_HEADER_AR_BASE.phone]);
  assignStr(patch, "phone2", row, ["phone2", "هاتف_ثاني", "هاتف ثاني", REPORT_B_EXPORT_HEADER_AR_BASE.phone2], {
    allowEmpty: true,
  });
  assignStr(patch, "company", row, ["company", "الشركة", REPORT_B_EXPORT_HEADER_AR_BASE.company], { allowEmpty: true });
  assignStr(patch, "position", row, ["position", "وظيفة", REPORT_B_EXPORT_HEADER_AR_BASE.position], { allowEmpty: true });
  assignStr(patch, "address", row, ["address", "عنوان", REPORT_B_EXPORT_HEADER_AR_BASE.address], { allowEmpty: true });
  assignStr(patch, "activity", row, ["activity", "نشاط", REPORT_B_EXPORT_HEADER_AR_BASE.activity], { allowEmpty: true });
  assignStr(patch, "quotePrice", row, ["quotePrice", "عرض_سعر", "عرض سعر", REPORT_B_EXPORT_HEADER_AR_BASE.quotePrice], {
    allowEmpty: true,
  });
  assignStr(patch, "quoteDetail", row, ["quoteDetail", "تفصيل_السعر", "تفصيل السعر", REPORT_B_EXPORT_HEADER_AR_BASE.quoteDetail], {
    allowEmpty: true,
  });
  assignStr(patch, "managementRecommendationText", row, [
    "managementRecommendationText",
    "توصيات_الإدارة",
    REPORT_B_EXPORT_HEADER_AR_BASE.managementRecommendationText,
  ], { allowEmpty: true });
  assignStr(patch, "managementRecommendationDate", row, [
    "managementRecommendationDate",
    "تاريخ_التوصية",
    REPORT_B_EXPORT_HEADER_AR_BASE.managementRecommendationDate,
  ], { allowEmpty: true });
  assignStr(patch, "callSummary", row, ["callSummary", "ملخص_مكالمة", "ملخص مكالمة", REPORT_B_EXPORT_HEADER_AR_BASE.callSummary], {
    allowEmpty: true,
  });
  assignStr(patch, "currentSituation", row, [
    "currentSituation",
    "ملخص_وموقف",
    "الموقف",
    REPORT_B_EXPORT_HEADER_AR_BASE.currentSituation,
  ], { allowEmpty: true });
  assignStr(patch, "salesNotes", row, ["salesNotes", "ملاحظات_سيلز", "ملاحظات سيلز", REPORT_B_EXPORT_HEADER_AR_BASE.salesNotes], {
    allowEmpty: true,
  });
  assignStr(patch, "finalStatusNote", row, ["finalStatusNote", "موقف_نهائي", "موقف نهائي", REPORT_B_EXPORT_HEADER_AR_BASE.finalStatusNote], {
    allowEmpty: true,
  });
  assignStr(patch, "clientWarmingText", row, ["clientWarmingText", REPORT_B_EXPORT_HEADER_AR_BASE.clientWarmingText], {
    allowEmpty: true,
  });
  assignStr(patch, "adPlatform", row, ["adPlatform", "منصة", REPORT_B_EXPORT_HEADER_AR_BASE.adPlatform], { allowEmpty: true });
  assignStr(patch, "sourceAdName", row, ["sourceAdName", "إعلان", REPORT_B_EXPORT_HEADER_AR_BASE.sourceAdName], {
    allowEmpty: true,
  });
  assignStr(patch, "presentingEmployeeName", row, [
    "presentingEmployeeName",
    "موظف_عرض",
    "موظف عرض",
    REPORT_B_EXPORT_HEADER_AR_BASE.presentingEmployeeName,
  ], { allowEmpty: true });

  const visitSched = cellStrAllowEmpty(row, [
    "visitAppointmentScheduled",
    "زيارة_محددة",
    "محدد_ميعاد",
    REPORT_B_EXPORT_HEADER_AR_BASE.visitAppointmentScheduled,
  ]);
  if (visitSched !== undefined) {
    const b = parseBoolCell(visitSched);
    if (b === true || b === false) patch.visitAppointmentScheduled = b;
  }

  assignStr(patch, "visitAppointmentDate", row, [
    "visitAppointmentDate",
    "تاريخ_زيارة",
    "تاريخ زيارة",
    REPORT_B_EXPORT_HEADER_AR_BASE.visitAppointmentDate,
  ], { allowEmpty: true });

  const qq = cellStrAllowEmpty(row, ["qqAnswer", "QQ", REPORT_B_EXPORT_HEADER_AR_BASE.qqAnswer]);
  if (qq !== undefined) {
    const b = parseBoolCell(qq);
    if (b !== undefined) patch.qqAnswer = b;
  }

  const cls = cellStrAllowEmpty(row, [
    "classificationId",
    "تصنيف_id",
    REPORT_B_EXPORT_HEADER_AR_BASE.classificationId,
  ]);
  if (cls !== undefined) {
    patch.classificationId = cls.trim() === "" ? null : cls.trim();
  }

  const slotsPatch = parseFollowUpSlotsForReportPatch(row);
  if (slotsPatch !== undefined) {
    patch.followUpSlots = slotsPatch;
  }

  const nfu = cellStrAllowEmpty(row, [
    "nextFollowUpAt",
    "متابعة_تالية",
    "متابعة تالية",
    REPORT_B_EXPORT_HEADER_AR_BASE.nextFollowUpAt,
  ]);
  if (nfu !== undefined) {
    const t = nfu.trim();
    if (t !== "") patch.nextFollowUpAt = t;
  }

  return { clientId, patch };
}
