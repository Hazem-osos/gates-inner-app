import { NewLeadsReportFilters } from "@/components/reports/new-leads-report-filters";
import { PageHeader } from "@/components/layout/page-header";
import { NewLeadsReportTable } from "@/components/reports/new-leads-report-table";
import { ReportActiveFiltersNotice } from "@/components/reports/report-active-filters-notice";
import { resolveSalesFilterDisplayName } from "@/lib/resolve-active-sales-name";
import { requireSessionUser } from "@/lib/auth-helpers";
import { formatDateArabicLong, todayInputDate } from "@/lib/date-arabic";
import {
  listNewLeadsForReport,
  listUsersForNewLeadReportFilter,
  NEW_LEADS_REPORT_REACH_NOT_REACHED_EXCL_EXPIRED,
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

  const dateFilterActive = fromYmd !== today || toYmd !== today;

  const activeFilterLines: string[] = [];
  if (dateFilterActive) {
    const dFrom = formatDateArabicLong(new Date(`${fromYmd}T12:00:00`));
    const dTo = formatDateArabicLong(new Date(`${toYmd}T12:00:00`));
    activeFilterLines.push(
      fromYmd === toYmd
        ? `تاريخ يوم الليد على اللوحة: ${dFrom}.`
        : `تاريخ يوم الليد: من ${dFrom} إلى ${dTo}.`
    );
  }
  if (salesUserId !== "all" && activeSalesName) {
    activeFilterLines.push(`من سجّل الليد: «${activeSalesName}» فقط.`);
  }
  if (adQ.trim()) {
    activeFilterLines.push(`الإعلان يحتوي: «${adQ.trim()}».`);
  }
  if (phoneQ.trim()) {
    activeFilterLines.push(`الهاتف يحتوي: «${phoneQ.trim()}».`);
  }
  if (reach === "NOT_REACHED") {
    activeFilterLines.push("الحالة: لم يتم الوصول.");
  } else if (reach === NEW_LEADS_REPORT_REACH_NOT_REACHED_EXCL_EXPIRED) {
    activeFilterLines.push(
      "الحالة: لم يتم الوصول (مع استبعاد من عُيّن له Expired)."
    );
  } else if (reach === "REACHED") {
    activeFilterLines.push("الحالة: تم الوصول.");
  }

  if (clsIncludeEmpty && clsSelectedIds.length === 0) {
    activeFilterLines.push(
      "التصنيف: بدون بطاقة أو بطاقة «قيد العمل» بلا تصنيف من قائمة الإدارة."
    );
  } else if (!clsIncludeEmpty && clsSelectedIds.length > 0) {
    const labels = clsSelectedIds
      .map((id) => classifications.find((c) => c.id === id)?.label)
      .filter((x): x is string => Boolean(x));
    if (labels.length > 0) {
      activeFilterLines.push(
        `التصنيف (بطاقة قيد العمل): ${labels.join("، ")}.`
      );
    }
  } else if (clsIncludeEmpty && clsSelectedIds.length > 0) {
    const labels = clsSelectedIds
      .map((id) => classifications.find((c) => c.id === id)?.label)
      .filter((x): x is string => Boolean(x));
    if (labels.length > 0) {
      activeFilterLines.push(
        `التصنيف: OR بين «بدون تصنيف» وبطاقات ضمن: ${labels.join("، ")}.`
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

      <ReportActiveFiltersNotice lines={activeFilterLines} />

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
