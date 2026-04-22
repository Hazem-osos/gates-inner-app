import { Suspense } from "react";

import { ExportToolbar } from "@/components/export/export-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { SalesFilterLinks } from "@/components/reports/sales-filter-links";
import { REPORT_FILTER_EXPORTS_BAR_CLASS } from "@/components/reports/report-page-exports-toolbar";
import {
  DashboardFollowupTablesSkeleton,
  DashboardRecommendationsSkeleton,
} from "@/components/skeletons/crm-skeletons";
import { dashboardFollowupsExportHref } from "@/lib/export-excel-href";
import { cn } from "@/lib/utils";
import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { DashboardFollowupBlocks } from "./_components/dashboard-followups-block";
import { DashboardRecommendationsBlock } from "./_components/dashboard-recommendations-block";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sales?: string }>;
}) {
  const user = await requireSessionUser();
  const dbUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const sp = await searchParams;
  const salesKey = sp.sales?.trim() ?? "all";

  const headerSubtitle =
    user.role === "SALES"
      ? `مرحباً ${user.name} — متابعاتك اليومية.`
      : salesKey === "all"
        ? `مرحباً ${user.name} — متابعات الفريق (كل السيلز).`
        : `مرحباً ${user.name} — متابعات المندوب المحدد في فلتر السيلز.`;

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="لوحة إرشادية بالمتابعات اليومية"
        subtitle={headerSubtitle}
      />

      <div
        className={cn(
          REPORT_FILTER_EXPORTS_BAR_CLASS,
          user.role === "SALES" ? "justify-start" : "justify-between"
        )}
        dir="rtl"
      >
        <ExportToolbar
          excelHref={dashboardFollowupsExportHref({ sales: salesKey })}
        />
        {user.role !== "SALES" ? (
          <div className="flex min-w-0 max-w-full flex-col items-end gap-1 self-center">
            <SalesFilterLinks
              bare
              role={user.role}
              pathname="/dashboard"
              searchParams={{}}
              currentSales={salesKey}
            />
          </div>
        ) : null}
      </div>

      <Suspense fallback={<DashboardRecommendationsSkeleton />}>
        <DashboardRecommendationsBlock
          user={user}
          dbUserId={dbUserId}
          salesKey={salesKey}
        />
      </Suspense>

      <Suspense fallback={<DashboardFollowupTablesSkeleton />}>
        <DashboardFollowupBlocks user={user} salesKey={salesKey} />
      </Suspense>
    </div>
  );
}
