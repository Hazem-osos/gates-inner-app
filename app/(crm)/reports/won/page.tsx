import Link from "next/link";

import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { ReportRecordsCount } from "@/components/reports/report-records-count";
import { ReportSortControls } from "@/components/reports/report-sort-controls";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateArabicLong } from "@/lib/date-arabic";
import { listClientsForReport } from "@/lib/data/report-queries";
import { parseReportSortParams } from "@/lib/report-sort-params";
import { ReportWorkLogDialog } from "@/components/reports/report-work-log-dialog";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { reportExportExcelHref } from "@/lib/export-excel-href";
import { reportPageDescriptionClass } from "@/lib/report-ui";
import { cn } from "@/lib/utils";
import { ClientStatus } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ReportWonPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    sales?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const user = await requireSessionUser();
  const workLogUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const sp = await searchParams;
  const salesKey = sp.sales ?? "all";
  const { sort, dir } = parseReportSortParams(sp);

  const clients = await listClientsForReport({
    role: user.role,
    userId: user.id,
    salesUserId: salesKey,
    status: ClientStatus.WON,
    sort,
    sortDir: dir,
    take: 500,
  });

  const from = sp.from ? startOfDay(new Date(sp.from)) : null;
  const to = sp.to ? endOfDay(new Date(sp.to)) : null;
  const filtered = clients.filter((c) => {
    if (!c.saleDate) return false;
    if (from && c.saleDate < from) return false;
    if (to && c.saleDate > to) return false;
    return true;
  });

  const filterActive =
    salesKey !== "all" || Boolean(sp.from || sp.to) || Boolean(sort);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="تم البيع"
        subtitle="عملاء اكتمل بيعهم."
      />

      <SalesFilterLinks
        role={user.role}
        pathname="/reports/won"
        searchParams={{
          ...(sp.from ? { from: sp.from } : {}),
          ...(sp.to ? { to: sp.to } : {}),
          ...(sort ? { sort } : {}),
          ...(dir !== "desc" ? { dir } : {}),
        }}
        currentSales={salesKey}
      />

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 p-4"
      >
        {salesKey !== "all" ? (
          <input type="hidden" name="sales" value={salesKey} />
        ) : null}
        <div>
          <label className="text-xs text-muted-foreground">من</label>
          <Input
            type="date"
            name="from"
            defaultValue={sp.from ?? ""}
            className="mt-0.5 block h-9 rounded-md border border-input px-2 py-1 text-sm"
            dir="ltr"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">إلى</label>
          <Input
            type="date"
            name="to"
            defaultValue={sp.to ?? ""}
            className="mt-0.5 block h-9 rounded-md border border-input px-2 py-1 text-sm"
            dir="ltr"
          />
        </div>
        <ReportSortControls defaultSort={sort} defaultDir={dir} />
        <button type="submit" className={cn(buttonVariants(), "h-9")}>
          فلترة
        </button>
      </form>

      <p className={reportPageDescriptionClass}>
        يعرض العملاء الذين تم البيع لهم فقط (مع فلتر التاريخ إن وُجد).
      </p>

      {filterActive ? (
        <p className="text-sm font-medium text-destructive">
          يوجد فلتر نشط على النتائج المعروضة.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ReportWorkLogDialog reportKey="report-won" userId={workLogUserId} />
        <ExportToolbar
          importKind="report-won"
          excelHref={reportExportExcelHref({
            kind: "report-won",
            sales: salesKey,
            from: sp.from,
            to: sp.to,
            ...(sort ? { sort, ...(dir !== "desc" ? { dir } : {}) } : {}),
          })}
        />
      </div>

      <ReportRecordsCount count={filtered.length} />

      <div className="overflow-x-auto rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>تاريخ البيع</TableHead>
              <TableHead>قيمة التعاقد</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>شركة</TableHead>
              <TableHead>هاتف</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell dir="ltr" className="text-xs">
                  {c.saleDate
                    ? formatDateArabicLong(new Date(c.saleDate))
                    : "—"}
                </TableCell>
                <TableCell dir="ltr">{c.contractValue?.toString() ?? "—"}</TableCell>
                <TableCell>
                  <Link href={`/clients/${c.id}`} className="text-primary underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.company ?? "—"}</TableCell>
                <TableCell dir="ltr">{c.phone}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
