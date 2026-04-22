import type { ExpectedField } from "@/lib/import/expected-field";
/** تطبيع الاسم/الشركة عند الحفظ: انظر `client-name-company-normalize.ts` */
import {
  MAX_FOLLOW_UP_SLOTS_EXCEL,
  followUpSlotDateHeaderAliases,
  followUpSlotDateHeaderAr,
  followUpSlotNoteHeaderAliases,
  followUpSlotNoteHeaderAr,
} from "@/lib/import/follow-up-slot-columns";

/** حقول الاستيراد من الهاتف حتى «متابعة تالية» — قبل JSON والمتابعات الديناميكية */
export const CLIENTS_FLAT_IMPORT_FIELDS_BASE: ExpectedField[] = [
  {
    key: "phone",
    label: "رقم الهاتف",
    required: true,
    aliases: [
      "موبايل",
      "جوال",
      "هاتف",
      "الهاتف",
      "رقم الهاتف",
      "رقم هاتف",
      "هاتف العميل",
      "رقم التليفون",
      "رقم التلفون",
      "تليفون",
      "تلفون",
      "رقم الجوال",
      "رقم الموبايل",
      "هاتف محمول",
      "رقم تليفون",
      "رقم تلفون",
      "mobile",
      "phone",
      "tel",
    ],
  },
  {
    key: "name",
    label: "اسم المسؤول / جهة الاتصال",
    required: false,
    aliases: [
      "اسم المسؤول",
      "المسؤول",
      "اسم المسئول",
      "جهة الاتصال",
      "اسم العميل",
      "الاسم",
      "اسم العميل بالكامل",
      "اسم صاحب الشركة",
      "contact person",
      "customer name",
    ],
  },
  {
    key: "company",
    label: "اسم الشركة / المنشأة",
    required: false,
    aliases: [
      "اسم الشركة",
      "الشركة",
      "اسم المنشأة",
      "company name",
      "organization",
    ],
  },
  {
    key: "activity",
    label: "النشاط",
    required: false,
    aliases: ["نوع النشاط", "مجال العمل", "القطاع", "activity"],
  },
  {
    key: "position",
    label: "الوظيفة",
    required: false,
    aliases: ["المسمى الوظيفي", "المنصب", "job title", "title"],
  },
  {
    key: "address",
    label: "العنوان",
    required: false,
    aliases: ["مكان العمل", "الموقع", "address"],
  },
  {
    key: "quotePrice",
    label: "عرض السعر",
    required: false,
    aliases: ["السعر", "التسعيرة", "عرض سعر", "quote"],
  },
  {
    key: "allowedDiscount",
    label: "الخصم الممنوح / نص",
    required: false,
    aliases: ["الخصم", "نسبة الخصم", "discount"],
  },
  {
    key: "salesNotes",
    label: "ملاحظات",
    required: false,
    aliases: ["ملاحظات المبيعات", "تعليقات", "notes", "remarks"],
  },
  {
    key: "sourceAdName",
    label: "اسم الإعلان",
    required: false,
    aliases: ["الإعلان", "اسم الاعلان", "ad name", "campaign"],
  },
  {
    key: "adPlatform",
    label: "قناة التسويق",
    required: false,
    aliases: ["منصة الإعلان", "مصدر العميل", "القناة", "platform", "source"],
  },
  {
    key: "visitAppointmentScheduled",
    label: "تم اجتماع / زيارة مجدولة (نعم/لا)",
    required: false,
    aliases: [
      "زيارة مجدولة",
      "اجتماع مجدول",
      "موعد زيارة",
      "visit scheduled",
    ],
  },
  {
    key: "visitAppointmentDate",
    label: "تاريخ الزيارة",
    required: false,
    aliases: ["موعد الزيارة", "تاريخ الموعد", "visit date"],
  },
  {
    key: "presentingEmployeeName",
    label: "موظف المبيعات",
    required: false,
    aliases: [
      "مندوب المبيعات",
      "مسؤول المبيعات",
      "البائع",
      "sales rep",
      "salesperson",
    ],
  },
  {
    key: "lossReason",
    label: "سبب الإغلاق",
    required: false,
    aliases: ["سبب الخسارة", "سبب الرفض", "loss reason"],
  },
  {
    key: "qqAnswer",
    label: "QQ (نعم/لا)",
    required: false,
    aliases: ["QQ", "سؤال الجودة"],
  },
  {
    key: "currentSituation",
    label: "الموقف الحالي",
    required: false,
    aliases: ["الحالة", "الوضع الحالي", "status"],
  },
  {
    key: "managementRecommendationText",
    label: "توصيات الاجتماع",
    required: false,
    aliases: [
      "توصيات الإدارة",
      "توصية الإدارة",
      "ملاحظات الإدارة",
      "recommendation",
    ],
  },
  {
    key: "managementRecommendationDate",
    label: "تاريخ التوصية / تاريخ اليوم",
    required: false,
    aliases: ["تاريخ التوصية", "تاريخ اليوم", "recommendation date"],
  },
  {
    key: "clientWarmingText",
    label: "تعليمات Warming",
    required: false,
    aliases: ["Warming", "تعليمات التسخين", "نص warming"],
  },
  {
    key: "initialCallDate",
    label: "تاريخ أول اتصال",
    required: false,
    aliases: ["أول اتصال", "تاريخ الاتصال الأول", "first call"],
  },
  {
    key: "nextFollowUpAt",
    label: "متابعة تالية",
    required: false,
    aliases: [
      "موعد المتابعة",
      "تاريخ المتابعة",
      "المتابعة القادمة",
      "next follow up",
    ],
  },
];

const FOLLOW_UP_SLOTS_JSON_FIELD: ExpectedField = {
  key: "followUpSlots",
  label: "متابعات (JSON، اختياري — قديم)",
  required: false,
  aliases: ["متابعات", "follow ups json", "followups"],
};

const CLIENTS_FLAT_IMPORT_FIELDS_TAIL: ExpectedField[] = [
  {
    key: "clientType",
    label: "نوع العميل (TB/TU/TC…)",
    required: false,
    aliases: ["نوع العميل", "تصنيف العميل", "client type", "type"],
  },
  {
    key: "daysCount",
    label: "عدد الأيام / نص مخصص",
    required: false,
    aliases: ["عدد الأيام", "أيام", "days"],
  },
];

function followUpPairFieldsForIndex(i: number): ExpectedField[] {
  return [
    {
      key: `followUpSlot${i}Note`,
      label: followUpSlotNoteHeaderAr(i),
      required: false,
      aliases: followUpSlotNoteHeaderAliases(i),
    },
    {
      key: `followUpSlot${i}Date`,
      label: followUpSlotDateHeaderAr(i),
      required: false,
      aliases: followUpSlotDateHeaderAliases(i),
    },
  ];
}

/**
 * قائمة حقول الاستيراد: أزواج «متابعة N — نص/تاريخ» حسب العدد المطلوب (ضمن الحد الأقصى للمتابعات في Excel).
 * تُستخدم مع زر «إضافة متابعة» واكتشاف العناوين من الملف.
 */
export function buildClientsFlatImportFields(
  followUpPairCount: number
): ExpectedField[] {
  const n = Math.min(
    Math.max(1, Math.floor(followUpPairCount) || 1),
    MAX_FOLLOW_UP_SLOTS_EXCEL
  );
  const slotPairs: ExpectedField[] = [];
  for (let i = 1; i <= n; i++) {
    slotPairs.push(...followUpPairFieldsForIndex(i));
  }
  return [
    ...CLIENTS_FLAT_IMPORT_FIELDS_BASE,
    FOLLOW_UP_SLOTS_JSON_FIELD,
    ...slotPairs,
    ...CLIENTS_FLAT_IMPORT_FIELDS_TAIL,
  ];
}

/** افتراضياً خانة متابعة واحدة — للتوافق مع الاستيراد البسيط */
export const CLIENTS_FLAT_IMPORT_FIELDS: ExpectedField[] =
  buildClientsFlatImportFields(1);

/** صف فارغ بعناوين أعمدة مطابقة للاستيراد — لتصدير قالب Excel */
export function buildClientsImportTemplateEmptyRow(): Record<string, string> {
  const row: Record<string, string> = {};
  for (const f of CLIENTS_FLAT_IMPORT_FIELDS) {
    row[f.label] = "";
  }
  return row;
}
