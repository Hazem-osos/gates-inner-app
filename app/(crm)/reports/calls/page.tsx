import Link from "next/link";

import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { ReportRecordsCount } from "@/components/reports/report-records-count";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ReportWorkLogDialog } from "@/components/reports/report-work-log-dialog";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { formatDateArabicLong, todayInputDate } from "@/lib/date-arabic";
import { prisma } from "@/lib/prisma";
import { callsReportExportExcelHref } from "@/lib/export-excel-href";
import { reportPageDescriptionClass } from "@/lib/report-ui";
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
    dateMode?: string;
  }>;
}) {
  const user = await requireSessionUser();
  const workLogUserId = (await resolveSessionDbUserId(user)) ?? user.id;
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

  /** created = عملاء أُضيفوا للنظام في الفترة؛ initial = من لهم أول اتصال في الفترة */
  const dateMode = sp.dateMode === "initial" ? "initial" : "created";

  const clients = await prisma.client.findMany({
    where:
      dateMode === "initial"
        ? {
            ...scope,
            initialCallDate: { gte: from, lte: to },
          }
        : {
            ...scope,
            createdAt: { gte: from, lte: to },
          },
    include: {
      assignedUser: { select: { name: true } },
    },
    orderBy:
      dateMode === "initial"
        ? { initialCallDate: "desc" }
        : { createdAt: "desc" },
    take: 800,
  });

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
    dateMode !== "created" ||
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
          ...(dateMode !== "created" ? { dateMode } : {}),
        }}
        currentSales={salesKey}
      />

      <form className="flex flex-wrap gap-3 rounded-xl border border-border/60 p-4 text-sm" method="get">
        <label className="flex flex-col gap-1">
          معنى الفترة
          <select
            name="dateMode"
            defaultValue={dateMode}
            className="min-w-56 rounded border px-2 py-1"
          >
            <option value="created">جدد في النظام (تاريخ الإنشاء)</option>
            <option value="initial">أول اتصال في الفترة</option>
          </select>
        </label>
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

      <p className={reportPageDescriptionClass}>
        {dateMode === "initial"
          ? "أول اتصال في الفترة:"
          : "العملاء المضافون جدد في الفترة:"}{" "}
        {stats.total} | محدد لهم زيارة: {stats.scheduled} | غير محدد:{" "}
        {stats.unscheduled}
      </p>

      {filterActive ? (
        <p className="text-sm font-medium text-destructive">
          يوجد فلتر نشط على النتائج المعروضة.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ReportWorkLogDialog reportKey="report-calls" userId={workLogUserId} />
        <ExportToolbar
          importKind="report-calls"
          excelHref={callsReportExportExcelHref({
            from: fromStr,
            to: toStr,
            dateMode,
            scheduled: scheduledFilter,
            sales: salesKey,
          })}
        />
      </div>

      <ReportRecordsCount count={filtered.length} />

      <div className="rounded-xl border border-border/80">
        <Table containerClassName="max-h-[min(70vh,calc(100vh-11rem))]">
          <TableHeader>
            <TableRow className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableHead>السيلز</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>
                {dateMode === "initial" ? "أول اتصال" : "تاريخ الإنشاء"}
              </TableHead>
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
                  {dateMode === "initial"
                    ? c.initialCallDate
                      ? formatDateArabicLong(new Date(c.initialCallDate))
                      : "—"
                    : formatDateArabicLong(new Date(c.createdAt))}
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
