import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { ReportWorkLogDialog } from "@/components/reports/report-work-log-dialog";
import { RecommendationsDateFilter } from "@/components/reports/recommendations-date-filter";
import {
  RecommendationsReportTable,
  type RecommendationReportRow,
} from "@/components/reports/recommendations-report-table";
import {
  GenericFilterActiveNotice,
  SalesFilterRecordsStatus,
} from "@/components/reports/sales-filter-records-status";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { resolveActiveSalesName } from "@/lib/resolve-active-sales-name";
import { buttonVariants } from "@/components/ui/button";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { todayInputDate } from "@/lib/date-arabic";
import { recommendationsExportExcelHref } from "@/lib/export-excel-href";
import { authorNamesByClientAndBody } from "@/lib/recommendation-author-lookup";
import { prisma } from "@/lib/prisma";
import {
  buildRecommendationsReportHref,
  clientPendingRecommendationDateWindowWhere,
  managementRecommendationDateWindowWhere,
  resolveRecommendationsDateSearchParams,
  ymdRangeToBounds,
} from "@/lib/recommendations-report-search";
import { userDisplayName } from "@/lib/user-display-name";
import { cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RecommendationsReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    sales?: string;
    from?: string;
    to?: string;
    full?: string;
  }>;
}) {
  const user = await requireSessionUser();
  const dbUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const workLogUserId = dbUserId;
  const sp = await searchParams;
  const filter = sp.filter ?? "all";
  const salesKey = sp.sales ?? "all";
  const activeSalesName = await resolveActiveSalesName(user.role, salesKey);
  const todayYmd = todayInputDate();
  const dateResolved = resolveRecommendationsDateSearchParams(sp);
  const { fromYmd, toYmd, fullDb: fullDbView } = dateResolved;
  const hasExplicitDateParams = Boolean(sp.from || sp.to);
  const { rangeStart, rangeEnd } = ymdRangeToBounds(fromYmd, toYmd);

  const dateLinkExtra: { fromYmd?: string; toYmd?: string; fullDb?: boolean } =
    fullDbView
      ? { fullDb: true }
      : hasExplicitDateParams
        ? { fromYmd, toYmd }
        : {};

  /** التوصية تُوجَّه للمندوب عبر targetUserId — لا تعتمد على مسند العميل الحالي. */
  const recommendationWhereBase: Prisma.ManagementRecommendationWhereInput =
    user.role === "SALES"
      ? { targetUserId: dbUserId }
      : salesKey !== "all"
        ? { targetUserId: salesKey }
        : {};

  const recommendationWhere: Prisma.ManagementRecommendationWhereInput =
    !fullDbView
      ? {
          AND: [
            recommendationWhereBase,
            managementRecommendationDateWindowWhere(rangeStart, rangeEnd),
          ],
        }
      : recommendationWhereBase;

  const allRecRows = await prisma.managementRecommendation.findMany({
    where: recommendationWhere,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      client: { include: { assignedUser: true } },
      author: true,
      targetUser: true,
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

  const clientWhereBase: Prisma.ClientWhereInput = {
    managementRecommendationText: { not: null },
    ...(user.role === "SALES"
      ? { assignedUserId: dbUserId }
      : salesKey !== "all"
        ? { assignedUserId: salesKey }
        : {}),
  };

  const clientWhere: Prisma.ClientWhereInput = !fullDbView
    ? {
        AND: [
          clientWhereBase,
          clientPendingRecommendationDateWindowWhere(rangeStart, rangeEnd),
        ],
      }
    : clientWhereBase;

  const clientsWithReportText = await prisma.client.findMany({
    where: clientWhere,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      company: true,
      phone: true,
      updatedAt: true,
      managementRecommendationText: true,
      managementRecommendationDate: true,
      assignedUser: true,
    },
  });

  const fromRecs: RecommendationReportRow[] = rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    clientName: r.client?.name ?? "—",
    company: r.client?.company ?? null,
    phone: r.client?.phone ?? null,
    salesName: (() => {
      const u = r.targetUser ?? r.client?.assignedUser;
      return u ? userDisplayName(u) : null;
    })(),
    body: r.body,
    recommendationDateIso: r.recommendationDate?.toISOString() ?? null,
    createdAtIso: r.createdAt.toISOString(),
    authorName: userDisplayName(r.author),
    workDateIso: r.workDate?.toISOString() ?? null,
    actionTaken: r.actionTaken,
  }));

  const clientOnlyCandidates: { c: (typeof clientsWithReportText)[0]; t: string; key: string }[] = [];
  for (const c of clientsWithReportText) {
    const t = (c.managementRecommendationText ?? "").trim();
    if (!t) continue;
    const key = `${c.id}\0${t}`;
    if (recKeysForDedupe.has(key)) continue;
    if (filter === "done") continue;
    clientOnlyCandidates.push({ c, t, key });
  }

  const authorByKey = await authorNamesByClientAndBody(
    clientOnlyCandidates.map((x) => ({ clientId: x.c.id, body: x.t })),
    recommendationWhereBase
  );

  const fromClientOnly: RecommendationReportRow[] = clientOnlyCandidates.map(
    ({ c, t, key }) => ({
      id: `pending-sync:${c.id}`,
      clientId: c.id,
      clientName: c.name,
      company: c.company ?? null,
      phone: c.phone ?? null,
      salesName: c.assignedUser
        ? userDisplayName(c.assignedUser)
        : null,
      body: t,
      recommendationDateIso:
        c.managementRecommendationDate?.toISOString() ?? null,
      createdAtIso: c.updatedAt.toISOString(),
      authorName: authorByKey.get(key) ?? "—",
      workDateIso: null,
      actionTaken: null,
    })
  );

  const tableRows = [...fromRecs, ...fromClientOnly].sort((a, b) => {
    const da = new Date(
      a.recommendationDateIso ?? a.createdAtIso
    ).getTime();
    const db = new Date(
      b.recommendationDateIso ?? b.createdAtIso
    ).getTime();
    return db - da;
  });

  const filterActive =
    filter !== "all" ||
    salesKey !== "all" ||
    hasExplicitDateParams ||
    sp.full === "1";

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="توصيات الإدارة"
        subtitle="عرض التوصيات وحفظ التاريخ والإجراء المتخذ لكل عميل. الافتراضي: يوم العمل الحالي."
      />

      <SalesFilterLinks
        role={user.role}
        pathname="/reports/recommendations"
        searchParams={{
          ...(filter !== "all" ? { filter } : {}),
          ...(!fullDbView && hasExplicitDateParams
            ? { from: fromYmd, to: toYmd }
            : {}),
          ...(fullDbView ? { full: "1" } : {}),
        }}
        currentSales={salesKey}
      />

      <RecommendationsDateFilter
        key={`${fromYmd}\0${toYmd}\0${fullDbView ? 1 : 0}`}
        fromYmd={fromYmd}
        toYmd={toYmd}
        fullDb={fullDbView}
        todayYmd={todayYmd}
        filter={filter}
        salesKey={salesKey}
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href={buildRecommendationsReportHref({
            filter: "all",
            sales: salesKey,
            ...dateLinkExtra,
          })}
          className={cn(
            buttonVariants({ variant: filter === "all" ? "default" : "outline", size: "sm" })
          )}
        >
          كل التوصيات
        </Link>
        <Link
          href={buildRecommendationsReportHref({
            filter: "pending",
            sales: salesKey,
            ...dateLinkExtra,
          })}
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
          href={buildRecommendationsReportHref({
            filter: "done",
            sales: salesKey,
            ...dateLinkExtra,
          })}
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

      {!activeSalesName && filterActive ? (
        <GenericFilterActiveNotice />
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ReportWorkLogDialog
          reportKey="report-recommendations"
          userId={workLogUserId}
          userRole={user.role}
        />
        <ExportToolbar
          mappedReportKind="report-recommendations"
          excelHref={recommendationsExportExcelHref({
            filter,
            sales: salesKey,
            ...(fullDbView
              ? { full: true }
              : { from: fromYmd, to: toYmd }),
          })}
        />
      </div>

      <SalesFilterRecordsStatus
        count={tableRows.length}
        activeSalesName={activeSalesName}
      />

      <RecommendationsReportTable rows={tableRows} />
    </div>
  );
}
