import { PageHeader } from "@/components/layout/page-header";
import { NewLeadsPanel } from "@/components/reports/new-leads-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSessionUser } from "@/lib/auth-helpers";
import { todayInputDate } from "@/lib/date-arabic";
import { listNewLeadsForEntryDay } from "@/lib/data/new-leads";

export const dynamic = "force-dynamic";

export default async function NewLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireSessionUser();
  const sp = await searchParams;
  const dateYmd = sp.date?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
    ? sp.date
    : todayInputDate();

  const rows = await listNewLeadsForEntryDay(dateYmd);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="Leads جديدة"
        subtitle="تسجيل سريع لرقم الهاتف والإعلان قبل إضافة بطاقة عميل — يُحفظ اسم السيلز لكل صف."
      />

      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 p-4 text-sm"
        method="get"
      >
        <label className="flex flex-col gap-1">
          يوم العمل
          <Input
            type="date"
            name="date"
            defaultValue={dateYmd}
            className="h-9 w-auto min-w-[11rem] rounded border px-2 py-1"
            dir="ltr"
          />
        </label>
        <Button type="submit" size="sm" variant="secondary">
          عرض
        </Button>
      </form>

      <NewLeadsPanel entryYmd={dateYmd} rows={rows} />
    </div>
  );
}
