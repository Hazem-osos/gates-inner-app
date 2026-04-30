"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-muted/15 p-4 text-sm leading-relaxed dark:bg-muted/10">
        <p className="font-semibold text-foreground">ملخص النتائج (حسب الفلاتر الحالية)</p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-muted-foreground">
          <li>
            إجمالي تصنيف <span className="font-mono text-foreground">B</span>:{" "}
            <span className="font-semibold tabular-nums text-foreground">{stats.catB}</span>
          </li>
          <li>
            إجمالي تصنيف <span className="font-mono text-foreground">C</span>:{" "}
            <span className="font-semibold tabular-nums text-foreground">{stats.catC}</span>
          </li>
          <li>
            إجمالي «لم يتم الوصول»:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {stats.notReached}
            </span>
          </li>
          <li>
            إجمالي «تم الوصول»:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {stats.reached}
            </span>
          </li>
          <li>
            إجمالي <span className="font-mono text-foreground">Z</span>:{" "}
            <span className="font-semibold tabular-nums text-foreground">{stats.catZ}</span>
          </li>
          <li>
            إجمالي Expired:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {stats.catExpired}
            </span>
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
              <TableHead className="min-w-[9rem]">الجوال</TableHead>
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
                  لا توجد ليدات ضمن الفترة والفلاتر.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const hasClient = Boolean(r.clientId);
                const rowPending = pendingLeadId === r.id;
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
                        {hasClient ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 w-full text-xs"
                            disabled
                          >
                            إنشاء بطاقة عميل
                          </Button>
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
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="relative z-[1] h-8 w-full text-xs"
                          disabled={hasClient || rowPending}
                          onClick={() =>
                            void run(r.id, () => markNewLeadBadClientAction(r.id), "تم تسجيل عميل سيء (Z)")
                          }
                        >
                          عميل سيء
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="relative z-[1] h-8 w-full text-xs"
                          disabled={rowPending}
                          onClick={() =>
                            void run(r.id, () => markNewLeadExpiredAction(r.id), "تم تعيين التصنيف Expired")
                          }
                        >
                          Expired
                        </Button>
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
