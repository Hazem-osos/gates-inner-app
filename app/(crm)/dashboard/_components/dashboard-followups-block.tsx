import Link from "next/link";

import { DashboardFollowupPreview } from "@/components/dashboard/dashboard-followup-preview";
import { loadDashboardFollowupBoardData } from "@/lib/data/dashboard-followup-board";
import type { SessionUser } from "@/lib/auth-helpers";
import { buttonVariants } from "@/components/ui/button";

export async function DashboardFollowupBlocks({
  user,
  salesKey,
}: {
  user: SessionUser;
  salesKey: string;
}) {
  const { todayRows, overdueRows } = await loadDashboardFollowupBoardData(
    user.role,
    user.id,
    salesKey
  );

  return (
    <>
      <section
        id="dashboard-today-followups"
        className="scroll-mt-24 space-y-2"
      >
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-3 rounded-t-xl border border-b-0 border-emerald-200/70 bg-emerald-50/95 px-4 py-3.5 text-emerald-950 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-emerald-50/90">
          <h2 className="text-lg font-semibold md:text-xl">متابعات اليوم</h2>
          {todayRows.length > 0 ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-lg font-bold tabular-nums text-emerald-900 ring-1 ring-emerald-200/80">
              {todayRows.length}
            </span>
          ) : null}
          <Link
            href="/dashboard/followups-today"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className:
                "ms-auto h-8 border-emerald-300/80 bg-background/80 text-emerald-950 hover:bg-emerald-100/80",
            })}
          >
            صفحة كاملة
          </Link>
        </div>
        <div className="rounded-b-xl border border-t-0 border-border/80 bg-background p-2">
          {todayRows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              لا توجد متابعات مجدولة اليوم.
            </p>
          ) : (
            <DashboardFollowupPreview rows={todayRows} tone="today" />
          )}
        </div>
      </section>

      <section className="space-y-2">
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-3 rounded-t-xl border border-b-0 border-rose-200/70 bg-rose-50/95 px-4 py-3.5 text-rose-950 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-rose-50/90">
          <h2 className="text-lg font-semibold md:text-xl">متابعات متأخرة</h2>
          {overdueRows.length > 0 ? (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-lg font-bold tabular-nums text-rose-900 ring-1 ring-rose-200/80">
              {overdueRows.length}
            </span>
          ) : null}
          <Link
            href="/dashboard/followups-overdue"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className:
                "ms-auto h-8 border-rose-300/80 bg-background/80 text-rose-950 hover:bg-rose-100/80",
            })}
          >
            صفحة كاملة
          </Link>
        </div>
        <div className="rounded-b-xl border border-t-0 border-border/80 bg-background p-2">
          {overdueRows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">لا يوجد تأخير.</p>
          ) : (
            <DashboardFollowupPreview rows={overdueRows} tone="overdue" />
          )}
        </div>
      </section>
    </>
  );
}
