import type { ExpectedField } from "@/lib/import/expected-field";
import {
  REPORT_B_EXPORT_HEADER_AR,
  REPORT_B_EXPORT_KEYS,
} from "@/lib/export/report-b-flat";
import {
  MAX_FOLLOW_UP_SLOTS_EXCEL,
  followUpSlotDateHeaderAliases,
  followUpSlotDateHeaderAr,
  followUpSlotDateKey,
  followUpSlotNoteHeaderAliases,
  followUpSlotNoteHeaderAr,
  followUpSlotNoteKey,
} from "@/lib/import/follow-up-slot-columns";

/** أعمدة المتابعة المسطّحة في التصدير — نفس ترتيب تقرير B / الجدول */
const FOLLOW_SLOT_KEY_RE = /^followUpSlot\d+(Note|Date)$/;

function reportBaseKeysWithoutFollowSlots(): string[] {
  return REPORT_B_EXPORT_KEYS.filter((k) => !FOLLOW_SLOT_KEY_RE.test(k));
}

/**
 * زوج نص/تاريخ للخانة n — عناوين تطابق تصدير Excel ومرادفات عناوين الجدول (متابعة n / تاريخ n).
 */
function followUpPairFieldsForReport(i: number): ExpectedField[] {
  return [
    {
      key: followUpSlotNoteKey(i),
      label: followUpSlotNoteHeaderAr(i),
      required: false,
      aliases: [
        ...followUpSlotNoteHeaderAliases(i),
        `متابعة ${i}`,
      ],
    },
    {
      key: followUpSlotDateKey(i),
      label: followUpSlotDateHeaderAr(i),
      required: false,
      aliases: [
        ...followUpSlotDateHeaderAliases(i),
        `تاريخ ${i}`,
      ],
    },
  ];
}

/**
 * حقول استيراد تقرير (تحديث صفوف) مع أزواج متابعة ديناميكية بدل ٣٠ خانة دفعة واحدة.
 * يبدأ بزوج واحد + زر «إضافة متابعة» في الواجهة.
 */
export function buildReportFlatImportFields(
  followUpPairCount: number,
  options?: { variant?: "report-won" }
): ExpectedField[] {
  const n = Math.min(
    Math.max(1, Math.floor(followUpPairCount) || 1),
    MAX_FOLLOW_UP_SLOTS_EXCEL
  );
  const baseKeys = reportBaseKeysWithoutFollowSlots();
  const base: ExpectedField[] = baseKeys.map((k) => ({
    key: k,
    label: REPORT_B_EXPORT_HEADER_AR[k] ?? k,
    required: k === "phone",
    ...(k === "phone"
      ? {
          aliases: ["phone", "الهاتف", "mobile", "جوال", "هاتف 1"],
        }
      : {}),
  }));
  const slots: ExpectedField[] = [];
  for (let i = 1; i <= n; i++) {
    slots.push(...followUpPairFieldsForReport(i));
  }
  if (options?.variant === "report-won") {
    return [
      ...base,
      ...slots,
      { key: "contractValue", label: "قيمة التعاقد", required: false },
      { key: "saleDate", label: "تاريخ البيع", required: false },
    ];
  }
  return [...base, ...slots];
}
