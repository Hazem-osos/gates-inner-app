import { requireSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { loadDashboardFollowupBoardData } from "@/lib/data/dashboard-followup-board";
import { DashboardFollowupDedicatedView } from "../_components/dashboard-followup-dedicated-view";

export const dynamic = "force-dynamic";

export default async function DashboardFollowupsOverduePage({
  searchParams,
}: {
  searchParams: Promise<{ sales?: string }>;
}) {
  const user = await requireSessionUser();
  const workLogUserId = (await resolveSessionDbUserId(user)) ?? user.id;
  const sp = await searchParams;
  const salesKey = sp.sales?.trim() ?? "all";

  const { classifications, overdueRows } = await loadDashboardFollowupBoardData(
    user.role,
    user.id,
    salesKey
  );

  return (
    <DashboardFollowupDedicatedView
      variant="overdue"
      user={user}
      workLogUserId={workLogUserId}
      salesKey={salesKey}
      rows={overdueRows}
      classifications={classifications}
    />
  );
}
