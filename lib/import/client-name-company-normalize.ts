/**
 * تطبيع `Client.name` (مسؤول الاتصال / الشخص) و`Client.company` (اسم المنشأة)
 * لكل مسارات استيراد العملاء — يمنع عكس الحقلين بين التقرير والقاعدة.
 *
 * - `name` في DB = يفضّل نص المسؤول؛ إن وُجدت شركة فقط يُستخدم اسم الشركة كاسم العميل.
 * - `company` = اسم الشركة فقط؛ فارغ إن لم يُرسل.
 */
export function normalizedImportNameAndCompany(args: {
  contactPerson: string;
  companyName: string;
  phoneFallbackSuffix: string;
}): { name: string; company: string | null } {
  const contact = args.contactPerson.trim();
  const comp = args.companyName.trim();
  const suffix = args.phoneFallbackSuffix.trim() || "0000";
  return {
    name: contact || comp || `عميل ${suffix}`,
    company: comp || null,
  };
}
