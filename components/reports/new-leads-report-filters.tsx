import Link from "next/link";

import {
  GenericFilterActiveNotice,
  SalesFilterActiveMessage,
} from "@/components/reports/sales-filter-records-status";
import { ReportRecordsCount } from "@/components/reports/report-records-count";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ClassificationRow } from "@/lib/data/classifications";
import { NEW_LEADS_REPORT_REACH_NOT_REACHED_EXCL_EXPIRED } from "@/lib/data/new-leads-report";

const PATH = "/reports/new-leads-report";

/** معاملات تُحفظ عند تغيير السيلز (بدون مفتاح sales). */
function commonSearchParts(opts: {
  fromYmd: string;
  toYmd: string;
  adQ: string;
  phoneQ: string;
  reach: string;
  category: string;
}): Record<string, string> {
  const q: Record<string, string> = {
    from: opts.fromYmd,
    to: opts.toYmd,
  };
  if (opts.adQ.trim()) q.ad = opts.adQ.trim();
  if (opts.phoneQ.trim()) q.phone = opts.phoneQ.trim();
  if (opts.reach !== "all") q.reach = opts.reach;
  if (opts.category !== "all") q.category = opts.category;
  return q;
}

function hrefWithSales(
  sales: string,
  parts: Record<string, string>
): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(parts)) {
    if (v !== undefined && v !== "") u.set(k, v);
  }
  if (sales !== "all") u.set("sales", sales);
  const s = u.toString();
  return s ? `${PATH}?${s}` : PATH;
}

function NewLeadsSalesPills({
  users,
  commonParts,
  salesUserId,
}: {
  users: { id: string; name: string }[];
  commonParts: Record<string, string>;
  salesUserId: string;
}) {
  const active = salesUserId !== "all" ? salesUserId : "all";

  return (
    <div className="sticky top-14 z-20 flex max-w-full flex-col gap-2 rounded-xl border border-border/60 bg-muted/95 px-3 py-2 text-sm shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-muted/90">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        من سجّل الليد الجديد:
      </span>
      <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href={hrefWithSales("all", commonParts)}
          className={cn(
            "inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap",
            active === "all"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-background hover:bg-muted"
          )}
        >
          الكل
        </Link>
        {users.map((u) => (
          <Link
            key={u.id}
            href={hrefWithSales(u.id, commonParts)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap",
              active === u.id
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background hover:bg-muted"
            )}
          >
            {u.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function NewLeadsReportFilters({
  today,
  fromYmd,
  toYmd,
  salesUserId,
  adQ,
  phoneQ,
  reach,
  category,
  users,
  activeSalesName,
  resultCount,
  classifications,
}: {
  today: string;
  fromYmd: string;
  toYmd: string;
  salesUserId: string;
  adQ: string;
  phoneQ: string;
  reach: string;
  category: string;
  users: { id: string; name: string }[];
  activeSalesName: string | null;
  resultCount: number;
  classifications: ClassificationRow[];
}) {
  const commonParts = commonSearchParts({
    fromYmd,
    toYmd,
    adQ,
    phoneQ,
    reach,
    category,
  });

  const isDefaultRange = fromYmd === today && toYmd === today;
  const chips: { label: string }[] = [];
  if (!isDefaultRange) {
    chips.push({
      label:
        fromYmd === toYmd
          ? `التاريخ: ${fromYmd}`
          : `التاريخ: من ${fromYmd} إلى ${toYmd}`,
    });
  }
  if (adQ.trim()) chips.push({ label: `إعلان: «${adQ.trim()}»` });
  if (phoneQ.trim()) chips.push({ label: `رقم الهاتف: «${phoneQ.trim()}»` });
  if (reach === "NOT_REACHED") chips.push({ label: "الحالة: لم يتم الوصول" });
  if (reach === NEW_LEADS_REPORT_REACH_NOT_REACHED_EXCL_EXPIRED) {
    chips.push({
      label: "الحالة: لم يتم الوصول (بدون معالجة Expired)",
    });
  }
  if (reach === "REACHED") chips.push({ label: "الحالة: تم الوصول" });
  if (category === "__empty__") {
    chips.push({ label: "التصنيف: بدون تصنيف (قائمة الإدارة) أو غير مرتبط" });
  } else if (category !== "all") {
    const cls = classifications.find((c) => c.id === category);
    if (cls) {
      chips.push({ label: `التصنيف: ${cls.label}` });
    }
  }

  const filterExtrasActive = chips.length > 0;
  const salesFilterActive = salesUserId !== "all";
  const filterActive = filterExtrasActive || salesFilterActive;

  const todayParts = commonSearchParts({
    fromYmd: today,
    toYmd: today,
    adQ,
    phoneQ,
    reach,
    category,
  });

  return (
    <div className="space-y-4">
      <NewLeadsSalesPills
        users={users}
        commonParts={commonParts}
        salesUserId={salesUserId}
      />

      <Card size="sm" className="ring-border/60">
        <CardHeader className="border-b border-border/50 pb-3">
          <CardTitle>فلترة نتائج Leads جديدة</CardTitle>
          <CardDescription>
            الفترة والبحث — ثم اضغط «تطبيق». اختصار «اليوم» يضبط التاريخ على
            اليوم مع الإبقاء على باقي الخيارات. حقل «التصنيف» يعرض تصنيفات
            العملاء المعرّفة من الإدارة (بطاقة مرتبطة).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <form method="get" className="space-y-5">
            {salesUserId !== "all" ? (
              <input type="hidden" name="sales" value={salesUserId} />
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="flex flex-wrap items-end gap-2">
                <Label className="flex min-w-[10rem] flex-col gap-1.5 font-normal">
                  <span className="text-xs text-muted-foreground">من تاريخ</span>
                  <Input
                    type="date"
                    name="from"
                    defaultValue={fromYmd}
                    dir="ltr"
                    className="relative z-[1] h-9 font-mono text-[0.8rem] sm:w-40"
                  />
                </Label>
                <Label className="flex min-w-[10rem] flex-col gap-1.5 font-normal">
                  <span className="text-xs text-muted-foreground">إلى تاريخ</span>
                  <Input
                    type="date"
                    name="to"
                    defaultValue={toYmd}
                    dir="ltr"
                    className="relative z-[1] h-9 font-mono text-[0.8rem] sm:w-40"
                  />
                </Label>
              </div>
              <Link
                href={hrefWithSales(salesUserId, todayParts)}
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-medium hover:bg-muted sm:shrink-0"
                )}
              >
                اليوم فقط
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Label className="flex flex-col gap-1.5 font-normal">
                <span className="text-xs text-muted-foreground">
                  الإعلان (بحث جزئي)
                </span>
                <Input
                  name="ad"
                  defaultValue={adQ}
                  placeholder="مثال: فيسبوك"
                  dir="rtl"
                  className="h-9"
                />
              </Label>
              <Label className="flex flex-col gap-1.5 font-normal">
                <span className="text-xs text-muted-foreground">
                  رقم الهاتف (بحث جزئي)
                </span>
                <Input
                  name="phone"
                  defaultValue={phoneQ}
                  dir="ltr"
                  placeholder="05…"
                  className="h-9 text-left font-mono text-[0.8rem]"
                />
              </Label>
              <Label className="flex flex-col gap-1.5 font-normal">
                <span className="text-xs text-muted-foreground">الحالة</span>
                <select
                  name="reach"
                  defaultValue={reach}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <option value="all">الكل</option>
                  <option value="NOT_REACHED">لم يتم الوصول</option>
                  <option value={NEW_LEADS_REPORT_REACH_NOT_REACHED_EXCL_EXPIRED}>
                    لم يتم الوصول (استبعاد المعرّف Expired من الإجراءات)
                  </option>
                  <option value="REACHED">تم الوصول</option>
                </select>
              </Label>
              <Label className="flex flex-col gap-1.5 font-normal sm:col-span-2 lg:col-span-1">
                <span className="text-xs text-muted-foreground">
                  التصنيف (بطاقة العميل)
                </span>
                <select
                  name="category"
                  defaultValue={category}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <option value="all">الكل</option>
                  <option value="__empty__">
                    بدون تصنيف من القائمة / غير مرتبط بعميل
                  </option>
                  {classifications.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Label>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
              <Button type="submit" size="sm" className="min-w-[7rem]">
                تطبيق
              </Button>
              <Link
                href={PATH}
                className={cn(
                  "inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted"
                )}
              >
                مسح الكل
              </Link>
              {!isDefaultRange ? (
                <span className="text-xs text-muted-foreground">
                  النطاق الحالي ليس «اليوم» — استخدم «اليوم فقط» أعلاه للعودة سريعاً.
                </span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-2 text-center" dir="rtl">
        {activeSalesName ? (
          <SalesFilterActiveMessage activeSalesName={activeSalesName} />
        ) : filterActive && chips.length === 0 ? (
          <GenericFilterActiveNotice />
        ) : !filterActive ? (
          <p className="text-center text-xs text-muted-foreground">
            لا توجد فلاتر إضافية — يعرض التقرير Leads جديدة <strong>اليوم</strong> فقط.
          </p>
        ) : null}

        {chips.length > 0 ? (
          <div className="flex max-w-full flex-wrap justify-center gap-2">
            {chips.map((c, i) => (
              <span
                key={`${c.label}-${i}`}
                className="inline-flex rounded-full border border-destructive/35 bg-destructive/8 px-2.5 py-1 text-xs font-medium text-destructive"
              >
                {c.label}
              </span>
            ))}
          </div>
        ) : null}

        <ReportRecordsCount
          count={resultCount}
          className="text-sm font-medium text-foreground"
        />
      </div>
    </div>
  );
}
