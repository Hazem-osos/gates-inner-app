import type { ExpectedField } from "@/lib/import/expected-field";

/** استيراد عملاء جدد — صف مسطّح (بدون أعمدة متابعات ديناميكية؛ استخدم followUpSlots كـ JSON). */
export const CLIENTS_FLAT_IMPORT_FIELDS: ExpectedField[] = [
  { key: "phone", label: "رقم الهاتف", required: true },
  { key: "name", label: "اسم الشركة / الاسم", required: false },
  { key: "company", label: "اسم المسؤول / الشركة المعروضة", required: false },
  { key: "activity", label: "النشاط", required: false },
  { key: "position", label: "الوظيفة", required: false },
  { key: "address", label: "العنوان", required: false },
  { key: "quotePrice", label: "عرض السعر", required: false },
  { key: "allowedDiscount", label: "الخصم الممنوح / نص", required: false },
  { key: "salesNotes", label: "ملاحظات", required: false },
  { key: "sourceAdName", label: "اسم الإعلان", required: false },
  { key: "adPlatform", label: "قناة التسويق", required: false },
  {
    key: "visitAppointmentScheduled",
    label: "تم اجتماع / زيارة مجدولة (نعم/لا)",
    required: false,
  },
  { key: "visitAppointmentDate", label: "تاريخ الزيارة", required: false },
  { key: "presentingEmployeeName", label: "موظف المبيعات", required: false },
  { key: "lossReason", label: "سبب الإغلاق", required: false },
  { key: "qqAnswer", label: "QQ (نعم/لا)", required: false },
  { key: "currentSituation", label: "الموقف الحالي", required: false },
  {
    key: "managementRecommendationText",
    label: "توصيات الاجتماع",
    required: false,
  },
  {
    key: "managementRecommendationDate",
    label: "تاريخ التوصية / تاريخ اليوم",
    required: false,
  },
  { key: "clientWarmingText", label: "تعليمات Warming", required: false },
  { key: "initialCallDate", label: "تاريخ أول اتصال", required: false },
  { key: "nextFollowUpAt", label: "متابعة تالية", required: false },
  {
    key: "followUpSlots",
    label: "متابعات (JSON، اختياري)",
    required: false,
  },
  { key: "clientType", label: "نوع العميل (TB/TU/TC…)", required: false },
  { key: "daysCount", label: "عدد الأيام / نص مخصص", required: false },
];
