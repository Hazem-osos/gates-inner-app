"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, UserX } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { NewLeadReachStatus } from "@prisma/client";

import {
  markNewLeadBadClientAction,
  markNewLeadExpiredAction,
} from "@/app/actions/new-leads";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  NewLeadReportRow,
  NewLeadReportStats,
} from "@/lib/data/new-leads-report";
import { cn } from "@/lib/utils";

function statusBadge(reach: NewLeadReachStatus) {
  if (reach === "NOT_REACHED") {
    return (
      <span className="inline-flex rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950/50 dark:text-red-200">
        لم يتم الوصول
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900 dark:bg-blue-950/50 dark:text-blue-100">
      تم الوصول
    </span>
  );
}

function catLabel(cat: string | null): string {
  if (!cat) return "—";
  if (cat === "EXPIRED") return "Expired";
  return cat;
}

function addClientHref(row: NewLeadReportRow) {
  const p = new URLSearchParams();
  p.set("newLeadId", row.id);
  p.set("phone", row.phone);
  p.set("date", row.entryYmd);
  if (row.adText.trim()) p.set("ad", row.adText);
  return `/clients/new?${p.toString()}`;
}

/** نسبة العدد من إجمالي السجلات المعروضة (حسب الفلاتر). */
function statPctOfTotal(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

function SummaryStatPct({ count, total }: { count: number; total: number }) {
  const p = statPctOfTotal(count, total);
  return (
    <span
      className="ms-1.5 tabular-nums text-xs font-bold text-red-600 dark:text-red-400"
      dir="ltr"
    >
      ({p}%)
    </span>
  );
}

export function NewLeadsReportTable({
  rows,
  stats,
}: {
  rows: NewLeadReportRow[];
  stats: NewLeadReportStats;
}) {
  const router = useRouter();
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);

  const run = useCallback(
    async (
      leadId: string,
      fn: () => Promise<{ ok: boolean; message?: string }>,
      okMsg: string
    ) => {
      setPendingLeadId(leadId);
      try {
        const res = await fn();
        if (!res.ok) {
          toast.error(res.message ?? "فشل التنفيذ.");
          return;
        }
        toast.success(okMsg);
        router.refresh();
      } catch (e) {
        console.error(e);
        toast.error("تعذر الاتصال بالخادم. جرّب تحديث الصفحة.");
      } finally {
        setPendingLeadId(null);
      }
    },
    [router]
  );

  const totalFiltered = rows.length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-muted/15 p-4 text-sm leading-relaxed dark:bg-muted/10">
        <p className="font-semibold text-foreground">ملخص Leads جديدة (حسب الفلاتر)</p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-muted-foreground">
          <li>
            إجمالي تصنيف <span className="font-mono text-foreground">B</span>:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {stats.catB}
            </span>
            <SummaryStatPct count={stats.catB} total={totalFiltered} />
          </li>
          <li>
            إجمالي تصنيف <span className="font-mono text-foreground">C</span>:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {stats.catC}
            </span>
            <SummaryStatPct count={stats.catC} total={totalFiltered} />
          </li>
          <li>
            إجمالي «لم يتم الوصول»:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {stats.notReached}
            </span>
            <SummaryStatPct count={stats.notReached} total={totalFiltered} />
          </li>
          <li>
            إجمالي «تم الوصول»:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {stats.reached}
            </span>
            <SummaryStatPct count={stats.reached} total={totalFiltered} />
          </li>
          <li>
            إجمالي <span className="font-mono text-foreground">Z</span>:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {stats.catZ}
            </span>
            <SummaryStatPct count={stats.catZ} total={totalFiltered} />
          </li>
          <li>
            إجمالي Expired:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {stats.catExpired}
            </span>
            <SummaryStatPct count={stats.catExpired} total={totalFiltered} />
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-border/80 shadow-sm">
        <Table
          containerClassName={cn(
            "max-h-[min(62vh,calc(100vh-12rem))]",
            rows.length === 0 && "max-h-none"
          )}
        >
          <TableHeader>
            <TableRow className="[&_th]:pointer-events-none [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableHead className="min-w-[9rem]">رقم الهاتف</TableHead>
              <TableHead className="min-w-[8rem]">اسم السيلز</TableHead>
              <TableHead className="min-w-[10rem]">اسم الإعلان</TableHead>
              <TableHead className="min-w-[8rem]">الحالة</TableHead>
              <TableHead className="min-w-[6rem]">التصنيف</TableHead>
              <TableHead className="min-w-[14rem]">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  لا توجد Leads جديدة ضمن الفترة والفلاتر.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const hasClient = Boolean(r.clientId);
                const rowPending = pendingLeadId === r.id;
                const isBadClient = r.leadCategory === "Z";
                const isExpired = r.leadCategory === "EXPIRED";
                const actionsLocked =
                  hasClient || rowPending || isBadClient || isExpired;
                const reportRowDisabledReason = hasClient
                  ? "لا يمكن — يوجد بطاقة عميل مرتبطة."
                  : rowPending
                    ? "جاري التنفيذ…"
                    : isBadClient
                      ? "لا يمكن — مسجّل كعميل سيء (Z)."
                      : isExpired
                        ? "لا يمكن — التصنيف Expired."
                        : undefined;

                return (
                  <TableRow key={r.id}>
                    <TableCell dir="ltr" className="font-mono text-sm">
                      {r.phone}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.salesName}
                    </TableCell>
                    <TableCell className="text-sm">{r.adText}</TableCell>
                    <TableCell>{statusBadge(r.reachStatus)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-sm",
                        r.reachStatus === "REACHED" &&
                          !r.leadCategory &&
                          "font-medium text-blue-700 dark:text-blue-300"
                      )}
                    >
                      {catLabel(r.leadCategory)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {hasClient && r.clientId ? (
                          <Link
                            href={`/clients/${r.clientId}`}
                            className={cn(
                              buttonVariants({ size: "sm", variant: "outline" }),
                              "relative z-[1] inline-flex h-8 w-full items-center justify-center gap-1 border-green-600/55 bg-green-50 text-xs font-semibold text-green-800 shadow-sm hover:bg-green-100 dark:border-green-600/45 dark:bg-green-950/45 dark:text-green-100 dark:hover:bg-green-950/65"
                            )}
                          >
                            <Check
                              className="size-3.5 shrink-0 text-green-700 dark:text-green-300"
                              aria-hidden
                            />
                            تم إنشاء بطاقة
                          </Link>
                        ) : (
                          <Link
                            href={addClientHref(r)}
                            className={cn(
                              buttonVariants({ size: "sm" }),
                              "relative z-[1] h-8 w-full justify-center text-xs"
                            )}
                          >
                            إنشاء بطاقة عميل
                          </Link>
                        )}
                        <div
                          className={cn(
                            "flex w-full flex-col gap-1.5",
                            actionsLocked && "cursor-not-allowed"
                          )}
                          title={
                            actionsLocked
                              ? reportRowDisabledReason ?? "الإجراء غير متاح."
                              : undefined
                          }
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className={cn(
                              "relative z-[1] h-8 w-full gap-1.5 text-xs font-semibold shadow-sm",
                              "border border-destructive/35 bg-destructive/15 hover:bg-destructive/25",
                              "dark:border-destructive/45 dark:bg-destructive/25 dark:hover:bg-destructive/35",
                              "disabled:pointer-events-none",
                              "disabled:opacity-100 disabled:grayscale-[0.72]",
                              "disabled:!border-border disabled:!bg-muted disabled:!text-muted-foreground",
                              "disabled:!shadow-none disabled:!ring-0 dark:disabled:!bg-muted/70",
                              "disabled:hover:!bg-muted disabled:hover:!text-muted-foreground",
                              "dark:disabled:hover:!bg-muted/70"
                            )}
                            disabled={actionsLocked}
                            onClick={() =>
                              void run(
                                r.id,
                                () => markNewLeadBadClientAction(r.id),
                                "تم تسجيل عميل سيء (Z)"
                              )
                            }
                          >
                            <UserX className="size-3.5 shrink-0" aria-hidden />
                            عميل سيء
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(
                              "relative z-[1] h-8 w-full text-xs font-medium shadow-sm hover:bg-muted/80",
                              "disabled:pointer-events-none",
                              "disabled:opacity-100 disabled:grayscale-[0.72]",
                              "disabled:!border-border disabled:!bg-muted disabled:!text-muted-foreground",
                              "disabled:!shadow-none disabled:!ring-0 dark:disabled:!bg-muted/70",
                              "disabled:hover:!bg-muted disabled:hover:!text-muted-foreground",
                              "dark:disabled:hover:!bg-muted/70"
                            )}
                            disabled={actionsLocked}
                            onClick={() =>
                              void run(
                                r.id,
                                () => markNewLeadExpiredAction(r.id),
                                "تم تعيين التصنيف Expired"
                              )
                            }
                          >
                            Expired
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
