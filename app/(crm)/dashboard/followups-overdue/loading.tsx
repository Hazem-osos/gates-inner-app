import { DashboardFollowupSingleTableSkeleton } from "@/components/skeletons/crm-skeletons";

export default function FollowupsOverdueLoading() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8">
      <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
      <DashboardFollowupSingleTableSkeleton />
    </div>
  );
}
