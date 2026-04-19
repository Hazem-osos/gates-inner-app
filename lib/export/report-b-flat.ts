import type { ReportBRow } from "@/components/reports/report-b-table";
import type { ReportClientPatchInput } from "@/app/actions/report-client-patch";

/** مفاتيح ثابتة لملف Excel (تصدير/استيراد) — صف واحد = عميل واحد */
export const REPORT_B_EXPORT_KEYS = [
  "id",
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
  "followUpSlots",
  "closedLostAt",
  "lossReason",
] as const;

export type ReportBExportKey = (typeof REPORT_B_EXPORT_KEYS)[number];

function boolToCell(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  return v ? "true" : "false";
}

function slotsToCell(slots: unknown): string {
  if (typeof slots === "string") return slots;
  try {
    return JSON.stringify(slots ?? []);
  } catch {
    return "[]";
  }
}

export function reportBRowToExportRecord(r: ReportBRow): Record<string, string> {
  return {
    id: r.id,
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
    followUpSlots: slotsToCell(r.followUpSlots),
    closedLostAt: r.closedLostAt ?? "",
    lossReason: r.lossReason ?? "",
  };
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

/**
 * يحوّل صف Excel (بعد sheet_to_json) إلى معرّف عميل + patch للحقول القابلة للتحديث من التقرير.
 * يُحدَّث الحقل فقط إذا وُجد عمود مطابق في الملف (استيراد جزئي عند حذف أعمدة من القالب).
 */
export function excelRowToReportClientPatch(
  row: Record<string, unknown>
): { clientId: string; patch: ReportClientPatchInput } | null {
  const clientId = cellStr(row, ["id", "معرف", "client_id", "معرف_العميل"]);
  if (!clientId) return null;

  const patch: ReportClientPatchInput = {};

  assignStr(patch, "name", row, ["name", "الاسم"]);
  assignStr(patch, "phone", row, ["phone", "الهاتف"]);
  assignStr(patch, "phone2", row, ["phone2", "هاتف_ثاني", "هاتف ثاني"], {
    allowEmpty: true,
  });
  assignStr(patch, "company", row, ["company", "الشركة"], { allowEmpty: true });
  assignStr(patch, "position", row, ["position", "وظيفة"], { allowEmpty: true });
  assignStr(patch, "address", row, ["address", "عنوان"], { allowEmpty: true });
  assignStr(patch, "activity", row, ["activity", "نشاط"], { allowEmpty: true });
  assignStr(patch, "quotePrice", row, ["quotePrice", "عرض_سعر"], {
    allowEmpty: true,
  });
  assignStr(patch, "quoteDetail", row, ["quoteDetail", "تفصيل_السعر"], {
    allowEmpty: true,
  });
  assignStr(patch, "managementRecommendationText", row, [
    "managementRecommendationText",
    "توصيات_الإدارة",
  ], { allowEmpty: true });
  assignStr(patch, "managementRecommendationDate", row, [
    "managementRecommendationDate",
    "تاريخ_التوصية",
  ], { allowEmpty: true });
  assignStr(patch, "callSummary", row, ["callSummary", "ملخص_مكالمة"], {
    allowEmpty: true,
  });
  assignStr(patch, "currentSituation", row, [
    "currentSituation",
    "ملخص_وموقف",
    "الموقف",
  ], { allowEmpty: true });
  assignStr(patch, "salesNotes", row, ["salesNotes", "ملاحظات_سيلز"], {
    allowEmpty: true,
  });
  assignStr(patch, "finalStatusNote", row, ["finalStatusNote", "موقف_نهائي"], {
    allowEmpty: true,
  });
  assignStr(patch, "clientWarmingText", row, ["clientWarmingText"], {
    allowEmpty: true,
  });
  assignStr(patch, "adPlatform", row, ["adPlatform", "منصة"], { allowEmpty: true });
  assignStr(patch, "sourceAdName", row, ["sourceAdName", "إعلان"], {
    allowEmpty: true,
  });
  assignStr(patch, "presentingEmployeeName", row, [
    "presentingEmployeeName",
    "موظف_عرض",
  ], { allowEmpty: true });

  const visitSched = cellStrAllowEmpty(row, [
    "visitAppointmentScheduled",
    "زيارة_محددة",
    "محدد_ميعاد",
  ]);
  if (visitSched !== undefined) {
    const b = parseBoolCell(visitSched);
    if (b === true || b === false) patch.visitAppointmentScheduled = b;
  }

  assignStr(patch, "visitAppointmentDate", row, [
    "visitAppointmentDate",
    "تاريخ_زيارة",
  ], { allowEmpty: true });

  const qq = cellStrAllowEmpty(row, ["qqAnswer", "QQ"]);
  if (qq !== undefined) {
    const b = parseBoolCell(qq);
    if (b !== undefined) patch.qqAnswer = b;
  }

  const cls = cellStrAllowEmpty(row, ["classificationId", "تصنيف_id"]);
  if (cls !== undefined) {
    patch.classificationId = cls.trim() === "" ? null : cls.trim();
  }

  const slotsRaw = cellStrAllowEmpty(row, ["followUpSlots", "متابعات"]);
  if (slotsRaw !== undefined) {
    const t = slotsRaw.trim();
    if (t === "") patch.followUpSlots = [];
    else {
      try {
        const p = JSON.parse(t) as unknown;
        patch.followUpSlots = Array.isArray(p) ? p : [];
      } catch {
        patch.followUpSlots = [];
      }
    }
  }

  const nfu = cellStrAllowEmpty(row, ["nextFollowUpAt", "متابعة_تالية"]);
  if (nfu !== undefined) {
    const t = nfu.trim();
    if (t !== "") patch.nextFollowUpAt = t;
  }

  return { clientId, patch };
}
