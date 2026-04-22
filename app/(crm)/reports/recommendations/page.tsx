import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import {
  RecommendationsReportTable,
  type RecommendationReportRow,
} from "@/components/reports/recommendations-report-table";
import { ReportRecordsCount } from "@/components/reports/report-records-count";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { buttonVariants } from "@/components/ui/button";
import { ReportWorkLogDialog } from "@/components/reports/report-work-log-dialog";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { recommendationsExportExcelHref } from "@/lib/export-excel-href";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RecommendationsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sales?: string }>;
}) {
  const user = await requireSessionUser();
  const dbUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const workLogUserId = dbUserId;
  const sp = await searchParams;
  const filter = sp.filter ?? "all";
  const salesKey = sp.sales ?? "all";

  /** التوصية تُوجَّه للمندوب عبر targetUserId — لا تعتمد على مسند العميل الحالي. */
  const recommendationWhere =
    user.role === "SALES"
      ? { targetUserId: dbUserId }
      : salesKey !== "all"
        ? { targetUserId: salesKey }
        : {};

  const allRecRows = await prisma.managementRecommendation.findMany({
    where: recommendationWhere,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 500,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          assignedUser: { select: { name: true } },
        },
      },
      author: { select: { name: true } },
      targetUser: { select: { name: true } },
    },
  });

  const recKeysForDedupe = new Set(
    allRecRows.map((r) => `${r.clientId}\0${r.body.trim()}`)
  );

  let rows = allRecRows;
  if (filter === "pending") {
    rows = rows.filter((r) => !(r.actionTaken ?? "").trim());
  } else if (filter === "done") {
    rows = rows.filter((r) => !!(r.actionTaken ?? "").trim());
  }

  const clientWhere: Prisma.ClientWhereInput = {
    managementRecommendationText: { not: null },
    ...(user.role === "SALES"
      ? { assignedUserId: dbUserId }
      : salesKey !== "all"
        ? { assignedUserId: salesKey }
        : {}),
  };

  const clientsWithReportText = await prisma.client.findMany({
    where: clientWhere,
    take: 500,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      managementRecommendationText: true,
      managementRecommendationDate: true,
      assignedUser: { select: { name: true } },
    },
  });

  const fromRecs: RecommendationReportRow[] = rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    clientName: r.client?.name ?? "—",
    salesName:
      r.targetUser?.name ?? r.client?.assignedUser?.name ?? null,
    body: r.body,
    recommendationDateIso: r.recommendationDate?.toISOString() ?? null,
    createdAtIso: r.createdAt.toISOString(),
    authorName: r.author.name,
    workDateIso: r.workDate?.toISOString() ?? null,
    actionTaken: r.actionTaken,
  }));

  const fromClientOnly: RecommendationReportRow[] = [];
  for (const c of clientsWithReportText) {
    const t = (c.managementRecommendationText ?? "").trim();
    if (!t) continue;
    const key = `${c.id}\0${t}`;
    if (recKeysForDedupe.has(key)) continue;
    if (filter === "done") continue;
    fromClientOnly.push({
      id: `pending-sync:${c.id}`,
      clientId: c.id,
      clientName: c.name,
      salesName: c.assignedUser?.name ?? null,
      body: t,
      recommendationDateIso:
        c.managementRecommendationDate?.toISOString() ?? null,
      createdAtIso: c.updatedAt.toISOString(),
      authorName: "عمود تقرير B",
      workDateIso: null,
      actionTaken: null,
    });
  }

  const tableRows = [...fromRecs, ...fromClientOnly].sort((a, b) => {
    const da = new Date(
      a.recommendationDateIso ?? a.createdAtIso
    ).getTime();
    const db = new Date(
      b.recommendationDateIso ?? b.createdAtIso
    ).getTime();
    return db - da;
  });

  const filterActive = filter !== "all" || salesKey !== "all";

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="توصيات الإدارة"
        subtitle="عرض التوصيات وحفظ التاريخ والإجراء المتخذ لكل عميل."
      />

      <SalesFilterLinks
        role={user.role}
        pathname="/reports/recommendations"
        searchParams={{
          ...(filter !== "all" ? { filter } : {}),
        }}
        currentSales={salesKey}
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/reports/recommendations${salesKey !== "all" ? `?sales=${salesKey}` : ""}`}
          className={cn(
            buttonVariants({ variant: filter === "all" ? "default" : "outline", size: "sm" })
          )}
        >
          كل التوصيات
        </Link>
        <Link
          href={`/reports/recommendations?filter=pending${salesKey !== "all" ? `&sales=${salesKey}` : ""}`}
          className={cn(
            buttonVariants({
              variant: filter === "pending" ? "default" : "outline",
              size: "sm",
            })
          )}
        >
          توصيات لم يتم اتخاذ إجراء
        </Link>
        <Link
          href={`/reports/recommendations?filter=done${salesKey !== "all" ? `&sales=${salesKey}` : ""}`}
          className={cn(
            buttonVariants({
              variant: filter === "done" ? "default" : "outline",
              size: "sm",
            })
          )}
        >
          توصيات تم اتخاذ إجراء
        </Link>
      </div>

      {filterActive ? (
        <p className="text-sm font-medium text-destructive">
          يوجد فلتر نشط على النتائج المعروضة.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ReportWorkLogDialog
          reportKey="report-recommendations"
          userId={workLogUserId}
        />
        <ExportToolbar
          mappedReportKind="report-recommendations"
          excelHref={recommendationsExportExcelHref({
            filter,
            sales: salesKey,
          })}
        />
      </div>

      <ReportRecordsCount count={tableRows.length} />

      <RecommendationsReportTable rows={tableRows} />
    </div>
  );
}
