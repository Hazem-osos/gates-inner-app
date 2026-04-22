import { AcknowledgeTransferButton } from "@/components/clients/acknowledge-transfer-button";
import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { ReportWorkLogDialog } from "@/components/reports/report-work-log-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { formatDateTimeArabic } from "@/lib/date-arabic";
import { transferredExportExcelHref } from "@/lib/export-excel-href";
import { prisma } from "@/lib/prisma";
import { userDisplayName } from "@/lib/user-display-name";

export const dynamic = "force-dynamic";

export default async function TransferredClientsReportPage() {
  const user = await requireSessionUser();
  const workLogUserId = (await resolveSessionDbUserId(user)) ?? user.id;

  const transfers = await prisma.clientTransfer.findMany({
    where: {
      toUserId: user.id,
      acknowledgedAt: null,
    },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true, phone: true, company: true } },
      fromUser: { select: { name: true, deletedAt: true } },
    },
  });

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="عملاء منقولون لك"
        subtitle="عملاء تم نقلهم إليك — اضغط تم الاطلاع بعد المراجعة."
      />

      <p className="text-sm font-medium text-destructive">
        بيان بالعملاء المنقولة حديثاً — برجاء الضغط على تم الاطلاع في حالة اتمام
        الاطلاع على العميل وعمل اللازم.
      </p>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ReportWorkLogDialog
          reportKey="report-transferred"
          userId={workLogUserId}
          userRole={user.role}
        />
        <ExportToolbar excelHref={transferredExportExcelHref()} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العميل</TableHead>
              <TableHead>من السيلز</TableHead>
              <TableHead>تاريخ النقل</TableHead>
              <TableHead>اطلاع</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  لا توجد عملاء منقولة جديدة.
                </TableCell>
              </TableRow>
            ) : (
              transfers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    {t.client.name} · <span dir="ltr">{t.client.phone}</span>
                  </TableCell>
                  <TableCell>
                    {t.fromUser ? userDisplayName(t.fromUser) : "—"}
                  </TableCell>
                  <TableCell dir="ltr" className="text-xs">
                    {formatDateTimeArabic(t.createdAt)}
                  </TableCell>
                  <TableCell>
                    <AcknowledgeTransferButton transferId={t.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
