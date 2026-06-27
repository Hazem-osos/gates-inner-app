"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, UserX, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { NewLeadReachStatus } from "@prisma/client";

import {
  clearNewLeadBadOrExpiredAction,
  markNewLeadBadClientAction,
  markNewLeadExpiredAction,
  updateNewLeadReportDescriptionAction,
} from "@/app/actions/new-leads";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ReportRowColorControls,
  ReportRowTintFilterBar,
} from "@/components/reports/report-row-color-controls";
import type {
  NewLeadReportRow,
  NewLeadReportStats,
} from "@/lib/data/new-leads-report";
import { formatDateTimeArabic } from "@/lib/date-arabic";
import {
  normalizeReportRowStyleColor,
  reportRowTintStyle,
  type ReportRowStyleColorKey,
} from "@/lib/report-row-style-ui";
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

function SummaryStatPct({
  count,
  total,
  pctClassName,
}: {
  count: number;
  total: number;
  /** لون النسبة — افتراضي أحمر مثل باقي الملخص */
  pctClassName?: string;
}) {
  const p = statPctOfTotal(count, total);
  return (
    <span
      className={cn(
        "ms-1.5 tabular-nums text-base font-bold text-red-600 dark:text-red-400",
        pctClassName
      )}
      dir="ltr"
    >
      ({p}%)
    </span>
  );
}
const newLeadSuccessControlClass = cn(
  buttonVariants({ size: "sm", variant: "outline" }),
  "relative z-[1] inline-flex h-8 w-full items-center justify-center gap-1 border-green-600/55 bg-green-50 text-xs font-semibold text-green-800 shadow-sm dark:border-green-600/45 dark:bg-green-950/45 dark:text-green-100 pointer-events-none cursor-default"
);

const summaryLeadActionStatLiClass = cn(
  "col-span-1 flex flex-wrap items-center gap-2 rounded-lg border border-green-600/45 bg-green-50/90 px-3 py-2.5 text-base text-green-900 shadow-sm dark:border-green-600/40 dark:bg-green-950/40 dark:text-green-100 sm:col-span-2 lg:col-span-3"
);

function NewLeadDescriptionCell({
  leadId,
  initialText,
  disabled,
}: {
  leadId: string;
  initialText: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(initialText);
  }, [initialText, leadId]);

  const dirty = text !== initialText;

  async function save() {
    if (disabled || saving || !dirty) return;
    setSaving(true);
    try {
      const res = await updateNewLeadReportDescriptionAction({
        leadId,
        reportDescription: text,
      });
      if (!res.ok) {
        toast.error(res.message ?? "تعذر حفظ الوصف.");
        return;
      }
      toast.success("تم حفظ الوصف.");
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("تعذر الاتصال بالخادم.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-w-[11rem] max-w-[22rem] flex-col gap-1.5">
      <Textarea
        dir="rtl"
        rows={2}
        disabled={disabled || saving}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Description…"
        className="min-h-12 max-h-40 resize-y text-sm leading-snug"
      />
      <Button
        type="button"
        size="sm"
        variant={dirty ? "default" : "secondary"}
        className="h-7 w-full text-xs"
        disabled={disabled || saving || !dirty}
        onClick={() => void save()}
      >
        {saving ? "جاري الحفظ…" : "حفظ الوصف"}
      </Button>
    </div>
  );
}

export function NewLeadsReportTable({
  rows,
  stats,
  rowStyles = {},
}: {
  rows: NewLeadReportRow[];
  stats: NewLeadReportStats;
  rowStyles?: Record<string, { color: string; legendNote: string }>;
}) {
  const router = useRouter();
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const [rowTintFilter, setRowTintFilter] =
    useState<ReportRowStyleColorKey | null>(null);

  const visibleRows = useMemo(() => {
    if (rowTintFilter === null) return rows;
    return rows.filter((r) => {
      const c = normalizeReportRowStyleColor(rowStyles[r.id]?.color);
      return c === rowTintFilter;
    });
  }, [rows, rowTintFilter, rowStyles]);

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
      <div className="rounded-xl border border-border/70 bg-muted/15 p-5 text-base leading-relaxed dark:bg-muted/10">
        <p className="text-xl font-bold text-foreground">
          ملخص Leads جديدة (حسب الفلاتر)
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-base text-muted-foreground">
          <li>
            إجمالي «تم الوصول»:{" "}
            <span className="text-lg font-bold tabular-nums text-foreground">
              {stats.reached}
            </span>
            <SummaryStatPct count={stats.reached} total={totalFiltered} />
          </li>
          <li>
            إجمالي «لم يتم الوصول»:{" "}
            <span className="text-lg font-bold tabular-nums text-foreground">
              {stats.notReached}
            </span>
            <SummaryStatPct count={stats.notReached} total={totalFiltered} />
          </li>
          <li className={summaryLeadActionStatLiClass}>
            <Check
              className="size-5 shrink-0 text-green-700 dark:text-green-300"
              aria-hidden
            />
            <span className="font-semibold">
              إجمالي مسجّل عميل سيء (Z)
              <span className="text-sm font-normal text-green-800/85 dark:text-green-200/90">
                {" "}
                — من زر الإجراءات
              </span>
              :
            </span>
            <span className="text-lg font-bold tabular-nums text-green-900 dark:text-green-50">
              {stats.leadMarkedBadClient}
            </span>
            <SummaryStatPct
              count={stats.leadMarkedBadClient}
              total={totalFiltered}
              pctClassName="text-base text-green-700 dark:text-green-400"
            />
          </li>
          <li className={summaryLeadActionStatLiClass}>
            <Check
              className="size-5 shrink-0 text-green-700 dark:text-green-300"
              aria-hidden
            />
            <span className="font-semibold">
              إجمالي مسجّل Expired
              <span className="text-sm font-normal text-green-800/85 dark:text-green-200/90">
                {" "}
                — من زر الإجراءات
              </span>
              :
            </span>
            <span className="text-lg font-bold tabular-nums text-green-900 dark:text-green-50">
              {stats.leadMarkedExpired}
            </span>
            <SummaryStatPct
              count={stats.leadMarkedExpired}
              total={totalFiltered}
              pctClassName="text-base text-green-700 dark:text-green-400"
            />
          </li>
          {stats.byClientClassification.map((c) => (
            <li key={c.id}>
              إجمالي{" "}
              <span className="text-lg font-semibold text-foreground">{c.label}</span>:{" "}
              <span className="text-lg font-bold tabular-nums text-foreground">
                {c.count}
              </span>
              <SummaryStatPct count={c.count} total={totalFiltered} />
            </li>
          ))}
          <li>
            إجمالي «تم البيع»{" "}
            <span className="text-sm text-muted-foreground">(بطاقة مرتبطة)</span>
            :{" "}
            <span className="text-lg font-bold tabular-nums text-foreground">
              {stats.linkedWon}
            </span>
            <SummaryStatPct count={stats.linkedWon} total={totalFiltered} />
          </li>
          <li>
            إجمالي «تم الإغلاق»{" "}
            <span className="text-sm text-muted-foreground">(بطاقة مرتبطة)</span>
            :{" "}
            <span className="text-lg font-bold tabular-nums text-foreground">
              {stats.linkedLost}
            </span>
            <SummaryStatPct count={stats.linkedLost} total={totalFiltered} />
          </li>
          <li>
            إجمالي مرتبط{" "}
            <span className="text-sm text-muted-foreground">
              (بدون تصنيف من قائمة الإدارة)
            </span>
            :{" "}
            <span className="text-lg font-bold tabular-nums text-foreground">
              {stats.linkedWithoutClassification}
            </span>
            <SummaryStatPct
              count={stats.linkedWithoutClassification}
              total={totalFiltered}
            />
          </li>
        </ul>
      </div>

      <ReportRowTintFilterBar
        rowTintFilter={rowTintFilter}
        onRowTintFilterChange={setRowTintFilter}
      />

      <div className="rounded-xl border border-border/80 shadow-sm">
        <Table
          containerClassName={cn(
            "max-h-[min(62vh,calc(100vh-12rem))]",
            rows.length === 0 && "max-h-none"
          )}
        >
          <TableHeader>
            <TableRow className="[&_th]:pointer-events-none [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableHead className="sticky right-0 z-20 min-w-[7.5rem] bg-background whitespace-normal text-center shadow-[0_1px_0_0_hsl(var(--border))]">
                لون الصف
              </TableHead>
              <TableHead className="min-w-[12rem] whitespace-nowrap">
                تاريخ التسجيل
              </TableHead>
              <TableHead className="min-w-[9rem]">رقم الهاتف</TableHead>
              <TableHead className="min-w-[8rem]">اسم السيلز</TableHead>
              <TableHead className="min-w-[10rem]">اسم الإعلان</TableHead>
              <TableHead className="min-w-[12rem] whitespace-normal">
                Description
              </TableHead>
              <TableHead className="min-w-[8rem]">الحالة</TableHead>
              <TableHead className="min-w-[6rem]">التصنيف</TableHead>
              <TableHead className="min-w-[14rem]">إجراءات</TableHead>
              <TableHead className="min-w-[10rem] whitespace-normal ps-2 text-center">
                إلغاء حالة العميل
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {rows.length === 0
                    ? "لا توجد Leads جديدة ضمن الفترة والفلاتر."
                    : "لا صفوف بهذا اللون — غيّر فلتر «لون الصف» أو ألِّن صفوفاً من الجدول."}
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((r) => {
                const hasClient = Boolean(r.clientId);
                const rowPending = pendingLeadId === r.id;
                const isBadClient = r.leadCategory === "Z";
                const isExpired = r.leadCategory === "EXPIRED";
                const canCancelBadOrExpired =
                  (isBadClient || isExpired) && !hasClient;
                const isCancelEnabled = canCancelBadOrExpired && !rowPending;
                const reportRowDisabledReason = hasClient
                  ? "لا يمكن — يوجد بطاقة عميل مرتبطة."
                  : rowPending
                    ? "جاري التنفيذ…"
                    : undefined;
                const rowStyle = rowStyles[r.id];
                const hasRowTint = Boolean(
                  normalizeReportRowStyleColor(rowStyle?.color)
                );

                return (
                  <TableRow
                    key={r.id}
                    className="align-top transition-shadow duration-200"
                    style={reportRowTintStyle(rowStyle?.color)}
                  >
                    <TableCell
                      className={cn(
                        "sticky right-0 z-10 border-s border-border/55 align-top dark:border-border/40",
                        hasRowTint ? "bg-inherit" : "bg-background"
                      )}
                    >
                      <ReportRowColorControls
                        apiBasePath={`/api/new-leads/${r.id}`}
                        rowStyle={rowStyle}
                        disabled={rowPending}
                      />
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {formatDateTimeArabic(new Date(r.createdAt))}
                    </TableCell>
                    <TableCell dir="ltr" className="font-mono text-sm">
                      {r.phone}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.salesName}
                    </TableCell>
                    <TableCell className="text-sm">{r.adText}</TableCell>
                    <TableCell className="align-top">
                      <NewLeadDescriptionCell
                        leadId={r.id}
                        initialText={r.reportDescription ?? ""}
                        disabled={rowPending}
                      />
                    </TableCell>
                    <TableCell>{statusBadge(r.reachStatus)}</TableCell>
                    <TableCell className="text-sm text-foreground">
                      {r.clientId
                        ? (r.clientClassificationLabel ?? "")
                        : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {hasClient && r.clientId ? (
                          <Link
                            href={`/clients/${r.clientId}`}
                            className={cn(
                              buttonVariants({ size: "sm", variant: "outline" }),
                              "relative z-[1] inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1 border-green-600/55 bg-green-50 text-xs font-semibold text-green-800 shadow-sm hover:bg-green-100 dark:border-green-600/45 dark:bg-green-950/45 dark:text-green-100 dark:hover:bg-green-950/65"
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
                              "relative z-[1] h-8 w-full cursor-pointer justify-center text-xs"
                            )}
                          >
                            إنشاء بطاقة عميل
                          </Link>
                        )}
                        <div
                          className={cn(
                            "flex w-full flex-col gap-1.5",
                            (hasClient || rowPending) && "cursor-not-allowed"
                          )}
                        >
                          {isBadClient ? (
                            <div className={newLeadSuccessControlClass}>
                              <Check
                                className="size-3.5 shrink-0 text-green-700 dark:text-green-300"
                                aria-hidden
                              />
                              تم تسجيل عميل سيء (Z)
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={cn(
                                "relative z-[1] h-8 w-full cursor-pointer gap-1.5 text-xs font-medium shadow-sm hover:bg-muted/80",
                                "disabled:pointer-events-none disabled:cursor-not-allowed",
                                "disabled:opacity-100 disabled:grayscale-[0.72]",
                                "disabled:!border-border disabled:!bg-muted disabled:!text-muted-foreground",
                                "disabled:!shadow-none disabled:!ring-0 dark:disabled:!bg-muted/70",
                                "disabled:hover:!bg-muted disabled:hover:!text-muted-foreground",
                                "dark:disabled:hover:!bg-muted/70"
                              )}
                              disabled={hasClient || rowPending}
                              title={
                                hasClient || rowPending
                                  ? reportRowDisabledReason
                                  : undefined
                              }
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
                          )}
                          {isExpired ? (
                            <div className={newLeadSuccessControlClass}>
                              <Check
                                className="size-3.5 shrink-0 text-green-700 dark:text-green-300"
                                aria-hidden
                              />
                              تم تعيين Expired
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={cn(
                                "relative z-[1] h-8 w-full cursor-pointer text-xs font-medium shadow-sm hover:bg-muted/80",
                                "disabled:pointer-events-none disabled:cursor-not-allowed",
                                "disabled:opacity-100 disabled:grayscale-[0.72]",
                                "disabled:!border-border disabled:!bg-muted disabled:!text-muted-foreground",
                                "disabled:!shadow-none disabled:!ring-0 dark:disabled:!bg-muted/70",
                                "disabled:hover:!bg-muted disabled:hover:!text-muted-foreground",
                                "dark:disabled:hover:!bg-muted/70"
                              )}
                              disabled={
                                hasClient ||
                                rowPending ||
                                isBadClient
                              }
                              title={
                                hasClient || rowPending
                                  ? reportRowDisabledReason
                                  : isBadClient
                                    ? "لا يمكن — مسجّل كعميل سيء (Z)."
                                    : undefined
                              }
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
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top ps-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={isCancelEnabled ? "default" : "secondary"}
                        className={cn(
                          "relative z-[1] h-auto min-h-8 w-full max-w-[11rem] whitespace-normal px-2 py-1.5 text-center text-[11px] font-medium leading-snug transition-colors",
                          isCancelEnabled
                            ? "border-0 bg-amber-600 font-semibold text-white shadow-md hover:bg-amber-700 hover:text-white focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:bg-amber-600 dark:hover:bg-amber-500"
                            : "cursor-not-allowed border border-dashed border-muted-foreground/40 bg-muted/50 font-normal text-muted-foreground opacity-80 shadow-none hover:bg-muted/50 hover:text-muted-foreground dark:bg-muted/30"
                        )}
                        disabled={!isCancelEnabled}
                        title={
                          rowPending
                            ? "جاري التنفيذ…"
                            : hasClient
                              ? "لا يمكن — يوجد بطاقة عميل مرتبطة."
                              : !isBadClient && !isExpired
                                ? "يُفعّل فقط عند تسجيل «عميل سيء» أو «Expired»."
                                : "إزالة تصنيف عميل سيء / Expired وإرجاع الليد للوضع الافتراضي"
                        }
                        onClick={() =>
                          void run(
                            r.id,
                            () => clearNewLeadBadOrExpiredAction(r.id),
                            "تم إلغاء التصنيف وإرجاع الليد للوضع الافتراضي"
                          )
                        }
                      >
                        <RotateCcw
                          className={cn(
                            "mx-auto mb-0.5 size-3.5",
                            isCancelEnabled
                              ? "text-white opacity-95"
                              : "text-muted-foreground opacity-60"
                          )}
                          aria-hidden
                        />
                        إلغاء حالة العميل
                      </Button>
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
