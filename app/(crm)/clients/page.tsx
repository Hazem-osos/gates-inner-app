import Link from "next/link";

import { TransferClientDialog } from "@/components/clients/transfer-client-dialog";
import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { aggregateClientsForScope } from "@/lib/data/client-aggregates";
import { listClientsForUser } from "@/lib/data/clients-list";
import { requireSessionUser } from "@/lib/auth-helpers";
import { formatDateArabicLong } from "@/lib/date-arabic";
import { prisma } from "@/lib/prisma";
import {
  clientsImportTemplateHref,
  clientsListExportHref,
} from "@/lib/export-excel-href";
import { clientScopeWhere } from "@/lib/report-scope";
import { statusLabelAr } from "@/lib/clients-form-values";
import { ClientStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ClientsListPage({
  searchParams,
}: {
  searchParams: Promise<{ sales?: string }>;
}) {
  const user = await requireSessionUser();
  const sp = await searchParams;
  const salesKey = sp.sales ?? "all";

  const clients = await listClientsForUser(user.role, user.id, salesKey);

  const salesUsers =
    user.role === "ADMIN" || user.role === "MANAGER"
      ? await prisma.user.findMany({
          where: { isActive: true, role: "SALES" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  const scopeWhere = clientScopeWhere({
    role: user.role,
    userId: user.id,
    salesUserId: salesKey,
  });

  const [{ total, byStatus, byClassification }, classifications] =
    await Promise.all([
      aggregateClientsForScope(scopeWhere),
      prisma.clientClassification.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true },
      }),
    ]);

  const statusCount = (s: ClientStatus) =>
    byStatus.find((x) => x.status === s)?._count._all ?? 0;

  const bCount = statusCount(ClientStatus.B);
  const nullClassCount =
    byClassification.find((x) => x.classificationId === null)?._count._all ??
    0;

  const classParts = classifications.map((cl) => {
    const n =
      byClassification.find((x) => x.classificationId === cl.id)?._count
        ._all ?? 0;
    return `${cl.label}: ${n}`;
  });

  const statsParts = [
    `إجمالي العملاء: ${total}`,
    `B: ${bCount}`,
    ...classParts,
    ...(nullClassCount > 0 ? [`بدون تصنيف: ${nullClassCount}`] : []),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="قائمة العملاء"
        subtitle={
          user.role === "SALES"
            ? "عملاءك المسندة إليك."
            : "كل العملاء — يمكنك نقل السيلز من القائمة."
        }
      />

      <SalesFilterLinks
        role={user.role}
        pathname="/clients"
        searchParams={{}}
        currentSales={salesKey}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ExportToolbar
          excelHref={clientsListExportHref({ sales: salesKey })}
        />
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            href={clientsImportTemplateHref()}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            تنزيل قالب Excel
          </Link>
          <Link
            href="/clients/import"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            استيراد من Excel
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-destructive">{statsParts.join(" | ")}</p>
        </div>
        <Link
          href="/clients/new"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          + إضافة عميل
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>القائمة</CardTitle>
          <CardDescription>آخر التحديثات أولاً</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا يوجد عملاء بعد.</p>
          ) : (
            clients.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-3 transition-colors hover:bg-muted/40"
              >
                <Link href={`/clients/${c.id}`} className="min-w-0 flex-1">
                  <p className="font-medium hover:underline">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.company ?? "—"} ·{" "}
                    <span dir="ltr">{c.phone}</span>
                  </p>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{statusLabelAr(c.status)}</Badge>
                  {c.nextFollowUpAt ? (
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      متابعة:{" "}
                      {formatDateArabicLong(new Date(c.nextFollowUpAt))}
                    </span>
                  ) : null}
                  {salesUsers.length > 0 ? (
                    <TransferClientDialog clientId={c.id} salesUsers={salesUsers} />
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
