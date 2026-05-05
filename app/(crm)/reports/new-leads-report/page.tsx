import { NewLeadsReportFilters } from "@/components/reports/new-leads-report-filters";
import { PageHeader } from "@/components/layout/page-header";
import { NewLeadsReportTable } from "@/components/reports/new-leads-report-table";
import { resolveSalesFilterDisplayName } from "@/lib/resolve-active-sales-name";
import { requireSessionUser } from "@/lib/auth-helpers";
import { todayInputDate } from "@/lib/date-arabic";
import { NewLeadsReportScopeNotice } from "@/components/reports/new-leads-report-scope-notice";
import {
  listNewLeadsForReport,
  listUsersForNewLeadReportFilter,
  parseNewLeadReportClsTokens,
} from "@/lib/data/new-leads-report";
import { listClientClassifications } from "@/lib/data/classifications";

export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default async function NewLeadsReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSessionUser();
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
  const clsFromUrl = get("cls")?.trim() ?? "";
  const categoryLegacy = get("category")?.trim();
  let cls = clsFromUrl;
  if (!cls && categoryLegacy && categoryLegacy !== "all") {
    cls = categoryLegacy;
  }

  const [users, classifications, activeSalesName] = await Promise.all([
    listUsersForNewLeadReportFilter(),
    listClientClassifications(),
    resolveSalesFilterDisplayName(salesUserId),
  ]);

  const validClsIds = new Set(classifications.map((c) => c.id));
  const { includeEmpty: clsIncludeEmpty, ids: clsSelectedIds } =
    parseNewLeadReportClsTokens(cls, validClsIds);

  const { rows, stats } = await listNewLeadsForReport(
    {
      fromYmd,
      toYmd,
      salesUserId,
      adQ,
      phoneQ,
      reach,
      cls,
    },
    { classifications }
  );

  const salesScopeLine = activeSalesName
    ? `من سجّل الليد: المستخدم «${activeSalesName}» فقط.`
    : "من سجّل الليد: كل المستخدمين النشطين في النظام (ضمن صلاحية عرض التقرير).";

  const classificationLines: string[] = [];
  if (clsIncludeEmpty || clsSelectedIds.length > 0) {
    if (clsIncludeEmpty && clsSelectedIds.length === 0) {
      classificationLines.push(
        "التصنيف: ليدات بدون بطاقة عميل، أو ببطاقة «قيد العمل» بلا تصنيف من قائمة الإدارة."
      );
    } else if (!clsIncludeEmpty && clsSelectedIds.length > 0) {
      const labels = clsSelectedIds
        .map((id) => classifications.find((c) => c.id === id)?.label)
        .filter((x): x is string => Boolean(x));
      classificationLines.push(
        `التصنيف: ليدات مرتبطة ببطاقة «قيد العمل» ضمن أحد التصنيفات: ${labels.join("، ")}.`
      );
    } else {
      const labels = clsSelectedIds
        .map((id) => classifications.find((c) => c.id === id)?.label)
        .filter((x): x is string => Boolean(x));
      classificationLines.push(
        `التصنيف (دمج OR): ليد بلا بطاقة/بلا تصنيف إداري، أو بطاقته «قيد العمل» ضمن: ${labels.join("، ")}.`
      );
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="تقرير Leads جديدة"
        subtitle="عرض Leads الجديدة المسجّلة من صفحة «Leads جديدة» مع الحالة والتصنيف والربط بإضافة عميل."
      />

      <NewLeadsReportScopeNotice
        fromYmd={fromYmd}
        toYmd={toYmd}
        salesLine={salesScopeLine}
        adQ={adQ}
        phoneQ={phoneQ}
        reach={reach}
        classificationLines={classificationLines}
      />

      <NewLeadsReportFilters
        today={today}
        fromYmd={fromYmd}
        toYmd={toYmd}
        salesUserId={salesUserId}
        adQ={adQ}
        phoneQ={phoneQ}
        reach={reach}
        clsQuery={cls}
        defaultIncludeEmpty={clsIncludeEmpty}
        defaultSelectedClsIds={clsSelectedIds}
        users={users}
        activeSalesName={activeSalesName}
        resultCount={rows.length}
        classifications={classifications}
      />

      <NewLeadsReportTable rows={rows} stats={stats} />
    </div>
  );
}
