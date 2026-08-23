import Link from "next/link";

import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import {
  GenericFilterActiveNotice,
  SalesFilterRecordsStatus,
} from "@/components/reports/sales-filter-records-status";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { resolveActiveSalesName } from "@/lib/resolve-active-sales-name";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CallsReportClassificationFilter } from "@/components/reports/calls-report-classification-filter";
import { CallsReportDateRangeFields } from "@/components/reports/calls-report-date-range-fields";
import { ReportActiveFiltersNotice } from "@/components/reports/report-active-filters-notice";
import { MAX_CLIENT_ROWS_FOR_UI } from "@/lib/constants/client-query-limits";
import { listClientClassifications } from "@/lib/data/classifications";
import { requireSessionUser } from "@/lib/auth-helpers";
import { formatDateArabicLong, todayInputDate } from "@/lib/date-arabic";
import { prisma } from "@/lib/prisma";
import { callsReportExportExcelHref } from "@/lib/export-excel-href";
import { clientScopeWhere } from "@/lib/report-scope";
import { endOfDay, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function CallsReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    scheduled?: string;
    sales?: string;
    ad?: string;
    cls?: string;
  }>;
}) {
  const user = await requireSessionUser();
  const sp = await searchParams;

  const todayStr = todayInputDate();
  const fromStr = sp.from ?? todayStr;
  const toStr = sp.to ?? todayStr;

  const from = startOfDay(new Date(fromStr));
  const to = endOfDay(new Date(toStr));

  const salesKey = sp.sales ?? "all";
  const scope = clientScopeWhere({
    role: user.role,
    userId: user.id,
    salesUserId: salesKey,
  });

  const scheduledFilter = sp.scheduled ?? "all";
  const adQ = sp.ad?.trim() ?? "";
  const clsRaw = sp.cls?.trim() ?? "";

  const [classifications, activeSalesName] = await Promise.all([
    listClientClassifications(),
    resolveActiveSalesName(user.role, salesKey),
  ]);

  const validClassificationIds = new Set(classifications.map((c) => c.id));
  const selectedClassificationIds = clsRaw
    ? clsRaw
        .split(",")
        .map((s) => s.trim())
        .filter((id) => validClassificationIds.has(id))
    : [];

  const clients = await prisma.client.findMany({
    where: {
      ...scope,
      createdAt: { gte: from, lte: to },
      ...(adQ ? { sourceAdName: { contains: adQ } } : {}),
      ...(selectedClassificationIds.length > 0
        ? { classificationId: { in: selectedClassificationIds } }
        : {}),
    },
    include: {
      assignedUser: { select: { name: true } },
      classification: { select: { label: true } },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_CLIENT_ROWS_FOR_UI,
  });

  const selectedClassificationLabels = classifications
    .filter((c) => selectedClassificationIds.includes(c.id))
    .map((c) => c.label);

  const filtered = clients.filter((c) => {
    const hasVisit = Boolean(c.visitAppointmentDate);
    const scheduledRow =
      c.visitAppointmentScheduled || hasVisit ? true : false;
    if (scheduledFilter === "yes") return scheduledRow;
    if (scheduledFilter === "no") return !scheduledRow;
    return true;
  });

  const stats = {
    total: filtered.length,
    scheduled: filtered.filter(
      (c) => c.visitAppointmentScheduled || c.visitAppointmentDate
    ).length,
    unscheduled: filtered.filter(
      (c) => !c.visitAppointmentScheduled && !c.visitAppointmentDate
    ).length,
  };

  const dateFilterActive = fromStr !== todayStr || toStr !== todayStr;
  const filterActive =
    scheduledFilter !== "all" ||
    salesKey !== "all" ||
    dateFilterActive ||
    Boolean(adQ) ||
    selectedClassificationIds.length > 0;

  const activeFilterLines: string[] = [];
  if (dateFilterActive) {
    const dFrom = formatDateArabicLong(new Date(`${fromStr}T12:00:00`));
    const dTo = formatDateArabicLong(new Date(`${toStr}T12:00:00`));
    activeFilterLines.push(
      fromStr === toStr
        ? `نطاق تاريخ إنشاء البطاقة: ${dFrom}.`
        : `نطاق تاريخ إنشاء البطاقة: من ${dFrom} إلى ${dTo}.`
    );
  }
  if (scheduledFilter === "yes") {
    activeFilterLines.push("المواعيد: المحدد لهم موعد زيارة فقط.");
  } else if (scheduledFilter === "no") {
    activeFilterLines.push("المواعيد: غير المحدد لهم موعد فقط.");
  }
  if (salesKey !== "all" && activeSalesName) {
    activeFilterLines.push(`السيلز: «${activeSalesName}» فقط.`);
  }
  if (adQ) {
    activeFilterLines.push(`اسم الإعلان يحتوي: «${adQ}».`);
  }
  if (selectedClassificationLabels.length > 0) {
    activeFilterLines.push(
      `تصنيف العميل: ${selectedClassificationLabels.join("، ")}.`
    );
  }

  const classificationPreserve =
    selectedClassificationIds.length > 0
      ? selectedClassificationIds.slice().sort().join(",")
      : undefined;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="عملاء جدد / المواعيد"
      />

      <ReportActiveFiltersNotice lines={activeFilterLines} />

      <SalesFilterLinks
        role={user.role}
        pathname="/reports/calls"
        searchParams={{
          ...(scheduledFilter !== "all" ? { scheduled: scheduledFilter } : {}),
          ...(sp.from ? { from: sp.from } : {}),
          ...(sp.to ? { to: sp.to } : {}),
          ...(adQ ? { ad: adQ } : {}),
          ...(classificationPreserve ? { cls: classificationPreserve } : {}),
        }}
        currentSales={salesKey}
      />

      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 p-4 text-sm"
        method="get"
      >
        <CallsReportDateRangeFields defaultFrom={fromStr} defaultTo={toStr} />
        <label className="flex min-w-[180px] flex-1 flex-col gap-1">
          بحث في اسم الإعلان
          <input
            name="ad"
            type="search"
            defaultValue={adQ}
            dir="rtl"
            placeholder="جزء من اسم الإعلان…"
            className="rounded border border-input bg-background px-2 py-1.5"
            autoComplete="off"
          />
        </label>
        <CallsReportClassificationFilter
          classifications={classifications}
          defaultSelectedIds={selectedClassificationIds}
        />
        <label className="flex flex-col gap-1">
          الفلتر
          <select
            name="scheduled"
            defaultValue={scheduledFilter}
            className="rounded border px-2 py-1"
          >
            <option value="all">الكل</option>
            <option value="yes">المحدد له ميعاد</option>
            <option value="no">الغير محدد</option>
          </select>
        </label>
        {salesKey !== "all" ? (
          <input type="hidden" name="sales" value={salesKey} />
        ) : null}
        <button
          type="submit"
          className="self-end rounded-md bg-primary px-3 py-1.5 text-primary-foreground"
        >
          تطبيق
        </button>
      </form>

      <p className="mx-auto max-w-4xl text-center text-sm font-medium leading-snug text-muted-foreground">
        العملاء المضافون جدد في الفترة: {stats.total} | محدد لهم زيارة: {stats.scheduled} |
        غير محدد: {stats.unscheduled}
      </p>

      {!activeSalesName && filterActive ? (
        <GenericFilterActiveNotice />
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ExportToolbar
          mappedReportKind="report-calls"
          excelHref={callsReportExportExcelHref({
            from: fromStr,
            to: toStr,
            scheduled: scheduledFilter,
            sales: salesKey,
            ad: adQ || undefined,
            cls: classificationPreserve,
          })}
        />
      </div>

      <SalesFilterRecordsStatus
        count={filtered.length}
        activeSalesName={activeSalesName}
      />

      <div className="rounded-xl border border-border/80">
        <Table containerClassName="max-h-[min(70vh,calc(100vh-11rem))]">
          <TableHeader>
            <TableRow className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableHead>السيلز</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>اسم الإعلان</TableHead>
              <TableHead>تصنيف العميل</TableHead>
              <TableHead>التليفون</TableHead>
              <TableHead>الشركة</TableHead>
              <TableHead>تاريخ الإدخال</TableHead>
              <TableHead>النشاط</TableHead>
              <TableHead>العنوان</TableHead>
              <TableHead>تاريخ الزيارة</TableHead>
              <TableHead>محدد ميعاد</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.assignedUser?.name ?? "—"}</TableCell>
                <TableCell>
                  <Link href={`/clients/${c.id}`} className="text-primary underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-xs" title={c.sourceAdName ?? undefined}>
                  {c.sourceAdName?.trim() ? c.sourceAdName : "—"}
                </TableCell>
                <TableCell className="text-xs">
                  {c.classification?.label ?? "—"}
                </TableCell>
                <TableCell dir="ltr" className="text-xs whitespace-nowrap">
                  {c.phone?.trim() ? c.phone : "—"}
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-xs">
                  {c.company?.trim() ? c.company : "—"}
                </TableCell>
                <TableCell dir="ltr" className="text-xs whitespace-nowrap">
                  {formatDateArabicLong(new Date(c.createdAt))}
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-xs">
                  {c.activity ?? "—"}
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-xs">
                  {c.address ?? "—"}
                </TableCell>
                <TableCell dir="ltr" className="text-xs whitespace-nowrap">
                  {c.visitAppointmentDate
                    ? formatDateArabicLong(new Date(c.visitAppointmentDate))
                    : "—"}
                </TableCell>
                <TableCell>
                  {c.visitAppointmentScheduled || c.visitAppointmentDate
                    ? "نعم"
                    : "لا"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
