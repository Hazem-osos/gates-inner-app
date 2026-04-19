import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import {
  RecommendationsReportTable,
  type RecommendationReportRow,
} from "@/components/reports/recommendations-report-table";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { buttonVariants } from "@/components/ui/button";
import { requireSessionUser } from "@/lib/auth-helpers";
import { recommendationsExportExcelHref } from "@/lib/export-excel-href";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RecommendationsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sales?: string }>;
}) {
  const user = await requireSessionUser();
  const sp = await searchParams;
  const filter = sp.filter ?? "all";
  const salesKey = sp.sales ?? "all";

  const clientScope =
    user.role === "SALES"
      ? { assignedUserId: user.id }
      : salesKey !== "all"
        ? { assignedUserId: salesKey }
        : {};

  let rows = await prisma.managementRecommendation.findMany({
    where: {
      client: clientScope,
    },
    orderBy: { createdAt: "desc" },
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
    },
  });

  if (filter === "pending") {
    rows = rows.filter((r) => !(r.actionTaken ?? "").trim());
  } else if (filter === "done") {
    rows = rows.filter((r) => !!(r.actionTaken ?? "").trim());
  }

  const tableRows: RecommendationReportRow[] = rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    clientName: r.client?.name ?? "—",
    salesName: r.client?.assignedUser?.name ?? null,
    body: r.body,
    recommendationDateIso: r.recommendationDate?.toISOString() ?? null,
    createdAtIso: r.createdAt.toISOString(),
    authorName: r.author.name,
    workDateIso: r.workDate?.toISOString() ?? null,
    actionTaken: r.actionTaken,
  }));

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

      <ExportToolbar
        importKind="report-recommendations"
        excelHref={recommendationsExportExcelHref({
          filter,
          sales: salesKey,
        })}
      />

      <RecommendationsReportTable rows={tableRows} />
    </div>
  );
}
