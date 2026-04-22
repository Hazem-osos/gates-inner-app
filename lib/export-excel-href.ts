/** روابط تصدير Excel متوافقة مع فلاتر التقارير المعروضة */
export function reportExportExcelHref(args: {
  kind: "report-b" | "report-not-b" | "report-closed" | "report-won";
  sales?: string;
  q?: string;
  sort?: string;
  dir?: string;
  /** تصنيف Not B */
  class?: string;
  from?: string;
  to?: string;
}): string {
  const u = new URLSearchParams();
  u.set("kind", args.kind);
  if (args.sales && args.sales !== "all") u.set("sales", args.sales);
  if (args.q?.trim()) u.set("q", args.q.trim());
  if (
    args.sort === "days" ||
    args.sort === "quotePrice" ||
    args.sort === "initialCallDate" ||
    args.sort === "nextFollowUpAt"
  ) {
    u.set("sort", args.sort);
  }
  if (args.dir === "asc" || args.dir === "desc") u.set("dir", args.dir);
  if (args.class && args.class !== "all") u.set("class", args.class);
  if (args.from?.trim()) u.set("from", args.from.trim());
  if (args.to?.trim()) u.set("to", args.to.trim());
  return `/api/export/excel?${u.toString()}`;
}

/** مطابقة رابط PDF مع نفس استعلام Excel */
export function pdfFromExcelHref(excelHref: string): string {
  return excelHref.replace("/api/export/excel", "/api/export/pdf");
}

/** رفع ملف Excel لاستيراد صفوف التقرير (POST FormData مع الحقل `file`) */
export function reportImportExcelUrl(kind: string): string {
  const u = new URLSearchParams();
  u.set("kind", kind);
  return `/api/import/report-xlsx?${u.toString()}`;
}

/** قائمة العملاء — حسب نطاق السيلز الحالي والبحث */
export function clientsListExportHref(args: { sales?: string; q?: string }): string {
  const u = new URLSearchParams();
  u.set("kind", "clients-list");
  if (args.sales && args.sales !== "all") u.set("sales", args.sales);
  if (args.q?.trim()) u.set("q", args.q.trim());
  return `/api/export/excel?${u.toString()}`;
}

/** لوحة المتابعات — متابعات اليوم ومتأخر في ورقتين */
export function dashboardFollowupsExportHref(): string {
  return `/api/export/excel?kind=dashboard-followups`;
}

/** تقرير Warming */
export function warmingExportExcelHref(args: {
  mode?: "overdue" | "all";
  sales?: string;
}): string {
  const u = new URLSearchParams();
  u.set("kind", "report-warming");
  if (args.mode === "overdue") u.set("mode", "overdue");
  if (args.sales && args.sales !== "all") u.set("sales", args.sales);
  return `/api/export/excel?${u.toString()}`;
}

/** توصيات الإدارة (نطاق تاريخ = كصفحة التقرير) */
export function recommendationsExportExcelHref(args: {
  filter?: string;
  sales?: string;
  from?: string;
  to?: string;
  full?: boolean;
}): string {
  const u = new URLSearchParams();
  u.set("kind", "report-recommendations");
  if (args.filter && args.filter !== "all") u.set("filter", args.filter);
  if (args.sales && args.sales !== "all") u.set("sales", args.sales);
  if (args.full) u.set("full", "1");
  else {
    if (args.from) u.set("from", args.from);
    if (args.to) u.set("to", args.to);
  }
  return `/api/export/excel?${u.toString()}`;
}

/** عملاء منقولون (غير المُقرّ باطلاعهم) */
export function transferredExportExcelHref(): string {
  return `/api/export/excel?kind=report-transferred`;
}

/** قالب فارغ لاستيراد Excel */
export function clientsImportTemplateHref(): string {
  return `/api/export/excel?kind=clients-import-template`;
}

/** تصدير تقرير عملاء جدد / المواعيد — نفس فلاتر الصفحة */
export function callsReportExportExcelHref(args: {
  from?: string;
  to?: string;
  dateMode?: "created" | "initial";
  scheduled?: string;
  sales?: string;
}): string {
  const u = new URLSearchParams();
  u.set("kind", "report-calls");
  if (args.from?.trim()) u.set("from", args.from.trim());
  if (args.to?.trim()) u.set("to", args.to.trim());
  if (args.dateMode === "initial") u.set("dateMode", "initial");
  if (args.scheduled && args.scheduled !== "all") {
    u.set("scheduled", args.scheduled);
  }
  if (args.sales && args.sales !== "all") u.set("sales", args.sales);
  return `/api/export/excel?${u.toString()}`;
}
