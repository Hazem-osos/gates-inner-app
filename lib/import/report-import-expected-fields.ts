import type { ExpectedField } from "@/lib/import/expected-field";
import {
  REPORT_B_EXPORT_HEADER_AR,
  REPORT_B_EXPORT_KEYS,
} from "@/lib/export/report-b-flat";

const ID_FIELD: ExpectedField = {
  key: "id",
  label: "معرّف العميل",
  required: true,
  aliases: [
    "رقم العميل",
    "كود العميل",
    "معرف العميل",
    "id",
    "client id",
    "رقم التسلسل",
  ],
};

const REPORT_BASE_FIELDS: ExpectedField[] = [
  ID_FIELD,
  ...REPORT_B_EXPORT_KEYS.map((k) => ({
    key: k,
    label: REPORT_B_EXPORT_HEADER_AR[k],
    required: false,
  })),
];

const WARMING_FIELDS: ExpectedField[] = [
  ID_FIELD,
  {
    key: "clientWarmingText",
    label: "اليوم الأول (نص Warming)",
    required: false,
  },
  { key: "day2Content", label: "اليوم الثاني", required: false },
  { key: "day3Content", label: "اليوم الثالث", required: false },
  { key: "day1Done", label: "تم اليوم 1", required: false },
  { key: "day2Done", label: "تم اليوم 2", required: false },
  { key: "day3Done", label: "تم اليوم 3", required: false },
];

const RECOMMENDATION_FIELDS: ExpectedField[] = [
  {
    key: "recommendation_id",
    label: "معرّف التوصية",
    required: true,
    aliases: ["رقم التوصية", "معرف التوصية", "recommendation id", "id"],
  },
  {
    key: "body",
    label: "نص التوصية",
    required: false,
    aliases: ["التوصية", "محتوى التوصية", "body", "recommendation text"],
  },
  {
    key: "actionTaken",
    label: "الإجراء المتخذ",
    required: false,
    aliases: ["الإجراء المنفذ", "ما تم اتخاذه", "action taken"],
  },
  {
    key: "workDate",
    label: "تاريخ العمل",
    required: false,
    aliases: ["يوم العمل", "تاريخ التنفيذ", "work date"],
  },
  {
    key: "recommendationDate",
    label: "تاريخ التوصية",
    required: false,
    aliases: ["تاريخ إصدار التوصية", "recommendation date"],
  },
];

/** حقول واجهة التعيين لكل نوع استيراد تقرير */
export function getReportImportExpectedFields(kind: string): ExpectedField[] {
  if (kind === "warming") return WARMING_FIELDS;
  if (kind === "report-recommendations") return RECOMMENDATION_FIELDS;

  if (kind === "report-won") {
    return [
      ...REPORT_BASE_FIELDS,
      { key: "contractValue", label: "قيمة التعاقد", required: false },
      { key: "saleDate", label: "تاريخ البيع", required: false },
    ];
  }

  return REPORT_BASE_FIELDS;
}
