/**
 * ألوان موحّدة لتصدير Excel، طباعة/PDF، واستيراد Excel (زر الاستيراد أزرق داكن موحّد).
 * تُدمج مع `buttonVariants({ variant: "outline" | "secondary", size: "sm" })` حيث يلزم.
 */

/** رابط/زر «تصدير Excel» — حدود زمردي فاتح */
export const REPORT_EXCEL_EXPORT_LINK_CLASS =
  "gap-1.5 border-emerald-200/90 bg-emerald-50/90 text-emerald-900 shadow-sm hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-100 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/55 dark:hover:text-emerald-50";

export const REPORT_EXCEL_EXPORT_ICON_CLASS =
  "size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400";

/** رابط «طباعة / PDF» */
export const REPORT_PDF_EXPORT_LINK_CLASS =
  "gap-1.5 border-rose-200/90 bg-rose-50/90 text-rose-900 shadow-sm hover:border-rose-300 hover:bg-rose-100 hover:text-rose-950 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-100 dark:hover:border-rose-700 dark:hover:bg-rose-900/50 dark:hover:text-rose-50";

export const REPORT_PDF_EXPORT_ICON_CLASS =
  "size-3.5 shrink-0 text-rose-600 dark:text-rose-400";

/**
 * زر «استيراد من Excel» (ممتلئ، أزرق داكن — موحّد مع أزرار التقرير).
 * يُدمج مع `buttonVariants({ variant: "secondary", size: "sm" })`.
 */
export const REPORT_EXCEL_IMPORT_SOLID_CLASS =
  "border-0 bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700 hover:text-white dark:bg-blue-600 dark:hover:bg-blue-500";

/**
 * رابط بنفس ألوان استيراد Excel (مثل صفحة العملاء → استيراد من Excel).
 * يُدمج مع `buttonVariants({ variant: "outline", size: "sm" })` ثم يُستبدل المظهر بـ solid عبر هذه الطبقة أو استخدم `default` + هذا النص.
 */
export const REPORT_EXCEL_IMPORT_LINK_SOLID_CLASS =
  "gap-1.5 border-0 bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:text-white dark:bg-blue-600 dark:hover:bg-blue-500";

export const REPORT_EXCEL_IMPORT_LINK_ICON_CLASS =
  "size-3.5 shrink-0 text-white";
