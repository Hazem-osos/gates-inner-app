import { AcknowledgeTransferButton } from "@/components/clients/acknowledge-transfer-button";
import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { ReportWorkLogDialog } from "@/components/reports/report-work-log-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  isManagerOrAdmin,
  requireSessionUser,
  resolveSessionDbUserId,
} from "@/lib/auth-helpers";
import {
  listSalesUsersForTransferReportFilters,
  transferredReportWhere,
} from "@/lib/data/client-transfers-report";
import { formatDateTimeArabic } from "@/lib/date-arabic";
import { transferredExportExcelHref } from "@/lib/export-excel-href";
import { prisma } from "@/lib/prisma";
import { userDisplayName } from "@/lib/user-display-name";

export const dynamic = "force-dynamic";

export default async function TransferredClientsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ fromSales?: string; toSales?: string }>;
}) {
  const user = await requireSessionUser();
  const workLogUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const sp = await searchParams;
  const fromSalesRaw = sp.fromSales?.trim() ?? "all";
  const toSalesRaw = sp.toSales?.trim() ?? "all";
  const managerPlus = isManagerOrAdmin(user.role);

  const salesOptions = managerPlus
    ? await listSalesUsersForTransferReportFilters()
    : [];
  const salesIds = new Set(salesOptions.map((s) => s.id));
  const fromSales =
    fromSalesRaw !== "all" && salesIds.has(fromSalesRaw)
      ? fromSalesRaw
      : "all";
  const toSales =
    toSalesRaw !== "all" && salesIds.has(toSalesRaw) ? toSalesRaw : "all";

  const transfers = await prisma.clientTransfer.findMany({
      where: transferredReportWhere(
        user.role,
        workLogUserId,
        fromSales,
        toSales
      ),
      orderBy: { createdAt: "desc" },
      take: managerPlus ? 5000 : 2000,
      include: {
        client: { select: { id: true, name: true, phone: true, company: true } },
        fromUser: { select: { name: true, deletedAt: true } },
        toUser: { select: { name: true, deletedAt: true } },
      },
    });

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title={managerPlus ? "عملاء منقولون" : "عملاء منقولون لك"}
        subtitle={
          managerPlus
            ? "جميع عملاء النقل بين المندوبين — استخدم الفلاتر للتضييق."
            : "عملاء تم نقلهم إليك — اضغط تم الاطلاع بعد المراجعة."
        }
      />

      <p className="text-sm font-medium text-destructive">
        بيان بالعملاء المنقولة حديثاً — برجاء الضغط على تم الاطلاع في حالة اتمام
        الاطلاع على العميل وعمل اللازم.
      </p>

      {managerPlus ? (
        <form
          className="flex flex-wrap items-end gap-4 rounded-xl border border-border/60 bg-muted/15 p-4 dark:bg-muted/10"
          method="get"
          dir="rtl"
        >
          <label className="grid gap-1.5 text-sm font-medium">
            عملاء منقولة من سيلز
            <select
              name="fromSales"
              defaultValue={fromSales}
              className="h-10 min-w-[14rem] rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="all">الكل</option>
              {salesOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            عملاء منقولة إلى سيلز
            <select
              name="toSales"
              defaultValue={toSales}
              className="h-10 min-w-[14rem] rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="all">الكل</option>
              {salesOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" size="sm" variant="secondary" className="h-10">
            تطبيق
          </Button>
        </form>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ReportWorkLogDialog
          reportKey="report-transferred"
          userId={workLogUserId}
          userRole={user.role}
        />
        <ExportToolbar
          excelHref={transferredExportExcelHref({
            fromSales,
            toSales,
          })}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العميل</TableHead>
              <TableHead>من السيلز</TableHead>
              {managerPlus ? <TableHead>إلى السيلز</TableHead> : null}
              <TableHead>تاريخ النقل</TableHead>
              {managerPlus ? <TableHead>الاطلاع</TableHead> : null}
              {!managerPlus ? <TableHead>اطلاع</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={managerPlus ? 5 : 4}
                  className="text-center text-muted-foreground"
                >
                  لا توجد عملاء منقولة ضمن العرض الحالي.
                </TableCell>
              </TableRow>
            ) : (
              transfers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    {t.client.name} ·{" "}
                    <span dir="ltr">{t.client.phone}</span>
                  </TableCell>
                  <TableCell>
                    {t.fromUser ? userDisplayName(t.fromUser) : "—"}
                  </TableCell>
                  {managerPlus ? (
                    <TableCell>
                      {t.toUser ? userDisplayName(t.toUser) : "—"}
                    </TableCell>
                  ) : null}
                  <TableCell dir="ltr" className="text-xs">
                    {formatDateTimeArabic(t.createdAt)}
                  </TableCell>
                  {managerPlus ? (
                    <TableCell>
                      {!t.acknowledgedAt ? (
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          لم يُقرَّ بعد
                        </span>
                      ) : (
                        <span dir="ltr" className="text-xs text-muted-foreground">
                          {formatDateTimeArabic(t.acknowledgedAt)}
                        </span>
                      )}
                      {!t.acknowledgedAt &&
                      t.toUserId === workLogUserId ? (
                        <div className="mt-2">
                          <AcknowledgeTransferButton transferId={t.id} />
                        </div>
                      ) : null}
                    </TableCell>
                  ) : (
                    <TableCell>
                      <AcknowledgeTransferButton transferId={t.id} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
