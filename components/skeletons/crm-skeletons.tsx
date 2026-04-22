import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** نبض خفيف لبديل «الخامة» — حواف ناعمة وظل خفيف */
function pulseLine(className?: string) {
  return (
    <Skeleton
      className={cn(
        "h-4 rounded-md bg-gradient-to-r from-muted via-muted-foreground/12 to-muted",
        className
      )}
    />
  );
}

export function DashboardRecommendationsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-2/3 max-w-md rounded-md bg-muted/80" />
      <div
        className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-6 dark:border-amber-900/40 dark:bg-amber-950/15"
        dir="rtl"
      >
        <Skeleton className="mb-4 h-6 w-48 rounded-md" />
        <div className="space-y-3">
          {pulseLine("h-3 w-full")}
          {pulseLine("h-3 w-[92%]")}
          {pulseLine("h-3 w-[88%]")}
        </div>
        <Skeleton className="mt-6 h-9 w-56 rounded-md" />
      </div>
    </div>
  );
}

export function DashboardFollowupTablesSkeleton() {
  return (
    <div className="space-y-10">
      {[0, 1].map((section) => (
        <div key={section} className="space-y-2">
          <div
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-t-xl border border-b-0 px-4 py-3.5",
              section === 0
                ? "border-emerald-200/50 bg-emerald-50/80 dark:border-emerald-900/40"
                : "border-rose-200/50 bg-rose-50/80 dark:border-rose-900/40"
            )}
          >
            <Skeleton className="h-7 w-40 rounded-md" />
            <Skeleton className="h-8 w-12 rounded-full" />
          </div>
          <div className="space-y-2 rounded-b-xl border border-t-0 border-border/80 bg-background p-4">
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-8 min-w-[4.5rem] shrink-0 rounded-md"
                />
              ))}
            </div>
            {Array.from({ length: 4 }).map((_, row) => (
              <div key={row} className="flex gap-2 border-t border-border/40 pt-3">
                {Array.from({ length: 8 }).map((_, col) => (
                  <Skeleton
                    key={col}
                    className="h-10 min-w-[5rem] flex-1 rounded-md"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClientsListCardSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card p-1">
      <div className="border-b border-border/50 px-4 py-3">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="mt-2 h-3 w-48 rounded-md" />
      </div>
      <div className="space-y-2 px-2 pb-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40 max-w-[14rem] rounded-md" />
              <Skeleton className="h-3 w-full max-w-xs rounded-md" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClientsStatsLineSkeleton() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <Skeleton className="h-5 w-full max-w-2xl rounded-md" />
      <Skeleton className="h-4 w-28 rounded-md" />
    </div>
  );
}
