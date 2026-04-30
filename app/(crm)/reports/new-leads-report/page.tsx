import { NewLeadsReportFilters } from "@/components/reports/new-leads-report-filters";
import { PageHeader } from "@/components/layout/page-header";
import { NewLeadsReportTable } from "@/components/reports/new-leads-report-table";
import { resolveActiveSalesName } from "@/lib/resolve-active-sales-name";
import { requireSessionUser } from "@/lib/auth-helpers";
import { todayInputDate } from "@/lib/date-arabic";
import {
  listNewLeadsForReport,
  listUsersForNewLeadReportFilter,
} from "@/lib/data/new-leads-report";

export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default async function NewLeadsReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSessionUser();
  const sp = await searchParams;
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const today = todayInputDate();
  const fromStr = get("from")?.trim();
  const toStr = get("to")?.trim();
  const fromYmd = fromStr && YMD.test(fromStr) ? fromStr : today;
  const toYmd = toStr && YMD.test(toStr) ? toStr : today;

  const salesUserId = get("sales")?.trim() ?? "all";
  const adQ = get("ad")?.trim() ?? "";
  const phoneQ = get("phone")?.trim() ?? "";
  const reach = get("reach")?.trim() ?? "all";
  const category = get("category")?.trim() ?? "all";

  const [users, { rows, stats }, activeSalesName] = await Promise.all([
    listUsersForNewLeadReportFilter(),
    listNewLeadsForReport({
      fromYmd,
      toYmd,
      salesUserId,
      adQ,
      phoneQ,
      reach,
      category,
    }),
    resolveActiveSalesName(user.role, salesUserId),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="تقرير ليدات جديدة"
        subtitle="عرض الليدات المسجّلة من صفحة «ليدات جديدة» مع الحالة والتصنيف والربط بإضافة عميل."
      />

      <NewLeadsReportFilters
        userRole={user.role}
        today={today}
        fromYmd={fromYmd}
        toYmd={toYmd}
        salesUserId={salesUserId}
        adQ={adQ}
        phoneQ={phoneQ}
        reach={reach}
        category={category}
        users={users}
        activeSalesName={activeSalesName}
        resultCount={rows.length}
      />

      <NewLeadsReportTable rows={rows} stats={stats} />
    </div>
  );
}
