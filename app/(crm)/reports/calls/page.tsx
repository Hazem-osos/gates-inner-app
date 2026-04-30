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
import { Input } from "@/components/ui/input";
import { MAX_CLIENT_ROWS_FOR_UI } from "@/lib/constants/client-query-limits";
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

  const [clients, activeSalesName] = await Promise.all([
    prisma.client.findMany({
      where: {
        ...scope,
        createdAt: { gte: from, lte: to },
      },
      include: {
        assignedUser: { select: { name: true } },
        classification: { select: { label: true } },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_CLIENT_ROWS_FOR_UI,
    }),
    resolveActiveSalesName(user.role, salesKey),
  ]);

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

  const filterActive =
    scheduledFilter !== "all" ||
    salesKey !== "all" ||
    Boolean(sp.from || sp.to);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="عملاء جدد / المواعيد"
      />

      <SalesFilterLinks
        role={user.role}
        pathname="/reports/calls"
        searchParams={{
          ...(scheduledFilter !== "all" ? { scheduled: scheduledFilter } : {}),
          ...(sp.from ? { from: sp.from } : {}),
          ...(sp.to ? { to: sp.to } : {}),
        }}
        currentSales={salesKey}
      />

      <form className="flex flex-wrap gap-3 rounded-xl border border-border/60 p-4 text-sm" method="get">
        <label className="flex flex-col gap-1">
          من تاريخ
          <Input
            type="date"
            name="from"
            defaultValue={fromStr}
            className="h-9 rounded border px-2 py-1"
            dir="ltr"
          />
        </label>
        <label className="flex flex-col gap-1">
          إلى تاريخ
          <Input
            type="date"
            name="to"
            defaultValue={toStr}
            className="h-9 rounded border px-2 py-1"
            dir="ltr"
          />
        </label>
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
              <TableHead>التليفون</TableHead>
              <TableHead>تصنيف العميل</TableHead>
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
                <TableCell dir="ltr" className="text-xs whitespace-nowrap">
                  {c.phone?.trim() ? c.phone : "—"}
                </TableCell>
                <TableCell className="text-xs">
                  {c.classification?.label ?? "—"}
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
