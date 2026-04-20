import type { PrismaClient } from "@prisma/client";

/** تسميات الحقول الأساسية للعميل — مصدر واحد للبذرة وإعادة التعبئة بعد المسح. */
export const CORE_FIELD_LABEL_DEFAULTS: readonly {
  fieldKey: string;
  labelAr: string;
  sortOrder: number;
}[] = [
  { fieldKey: "name", labelAr: "اسم العميل", sortOrder: 10 },
  { fieldKey: "phone", labelAr: "رقم الهاتف", sortOrder: 20 },
  { fieldKey: "company", labelAr: "اسم الشركة", sortOrder: 30 },
  { fieldKey: "position", labelAr: "المسمى الوظيفي", sortOrder: 40 },
  { fieldKey: "address", labelAr: "العنوان", sortOrder: 50 },
  { fieldKey: "quotePrice", labelAr: "عرض السعر", sortOrder: 60 },
  { fieldKey: "allowedDiscount", labelAr: "الخصم المسموح", sortOrder: 70 },
  { fieldKey: "status", labelAr: "تصنيف العميل", sortOrder: 80 },
  { fieldKey: "sourceAdName", labelAr: "اسم الإعلان", sortOrder: 90 },
  { fieldKey: "initialCallDate", labelAr: "تاريخ أول اتصال", sortOrder: 100 },
  {
    fieldKey: "nextFollowUpAt",
    labelAr: "تاريخ المتابعة التالي",
    sortOrder: 110,
  },
  { fieldKey: "contractValue", labelAr: "قيمة التعاقد", sortOrder: 120 },
  { fieldKey: "saleDate", labelAr: "تاريخ البيع", sortOrder: 130 },
  { fieldKey: "lossReason", labelAr: "سبب الإغلاق", sortOrder: 140 },
  { fieldKey: "closedLostAt", labelAr: "تاريخ الإغلاق", sortOrder: 150 },
];

export async function upsertCoreFieldLabels(prisma: PrismaClient): Promise<void> {
  for (const row of CORE_FIELD_LABEL_DEFAULTS) {
    await prisma.coreFieldLabel.upsert({
      where: { fieldKey: row.fieldKey },
      create: { ...row, visible: true },
      update: { labelAr: row.labelAr, sortOrder: row.sortOrder },
    });
  }
}
