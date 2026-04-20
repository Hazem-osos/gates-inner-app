import type { ReportSortDir, ReportSortKey } from "@/lib/data/report-queries";

type Props = {
  defaultSort: ReportSortKey | undefined;
  defaultDir: ReportSortDir;
};

/** حقول GET: `sort` و `dir` — ضعها داخل `<form method="get">` مع الحقول المخفية الأخرى */
export function ReportSortControls({ defaultSort, defaultDir }: Props) {
  return (
    <>
      <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
        <span className="shrink-0 font-medium text-foreground">ترتيب حسب</span>
        <select
          name="sort"
          defaultValue={defaultSort ?? ""}
          className="h-9 min-w-[220px] rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">الافتراضي (تاريخ الإنشاء)</option>
          <option value="nextFollowUpAt">تاريخ المتابعة التالية</option>
          <option value="initialCallDate">تاريخ أول اتصال</option>
          <option value="quotePrice">عرض السعر</option>
          <option value="days">أيام منذ أول اتصال</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm">
        <span className="shrink-0 font-medium text-foreground">الاتجاه</span>
        <select
          name="dir"
          defaultValue={defaultDir}
          className="h-9 min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="desc">تنازلي</option>
          <option value="asc">تصاعدي</option>
        </select>
      </label>
    </>
  );
}
