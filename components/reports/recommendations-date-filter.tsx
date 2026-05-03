"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ArabicDateField } from "@/components/ui/arabic-date-field";
import { Label } from "@/components/ui/label";
import { buildRecommendationsReportHref } from "@/lib/recommendations-report-search";
import { cn } from "@/lib/utils";

export function RecommendationsDateFilter(props: {
  fromYmd: string;
  toYmd: string;
  fullDb: boolean;
  todayYmd: string;
  filter: string;
  salesKey: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(props.fromYmd);
  const [to, setTo] = useState(props.toYmd);

  useEffect(() => {
    setFrom(props.fromYmd);
    setTo(props.toYmd);
  }, [props.fromYmd, props.toYmd]);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const u = new URL(
      buildRecommendationsReportHref({
        filter: props.filter,
        sales: props.salesKey,
        fromYmd: from,
        toYmd: to,
        fullDb: false,
      }),
      window.location.origin
    );
    router.push(u.pathname + u.search);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-end">
      <form
        onSubmit={apply}
        className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="rec-from" className="text-xs text-muted-foreground">
            من تاريخ
          </Label>
          <ArabicDateField
            valueYmd={from}
            allowEmpty={false}
            onValueChange={setFrom}
            disabled={props.fullDb}
            buttonClassName="h-10 w-full min-w-[140px] justify-center font-semibold sm:w-[150px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rec-to" className="text-xs text-muted-foreground">
            إلى تاريخ
          </Label>
          <ArabicDateField
            valueYmd={to}
            allowEmpty={false}
            onValueChange={setTo}
            disabled={props.fullDb}
            buttonClassName="h-10 w-full min-w-[140px] justify-center font-semibold sm:w-[150px]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className={cn(buttonVariants({ size: "sm" }))}
            disabled={props.fullDb}
          >
            تطبيق النطاق
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-end gap-2 border-t border-border/50 pt-3 sm:ml-auto sm:border-t-0 sm:pt-0">
        <Link
          href={buildRecommendationsReportHref({
            filter: props.filter,
            sales: props.salesKey,
            fullDb: true,
          })}
          className={cn(
            buttonVariants({
              size: "sm",
              variant: props.fullDb ? "default" : "secondary",
            })
          )}
        >
          عرض جميع التوصيات (قاعدة البيانات)
        </Link>
        {props.fullDb ? (
          <Link
            href={buildRecommendationsReportHref({
              filter: props.filter,
              sales: props.salesKey,
              fromYmd: props.todayYmd,
              toYmd: props.todayYmd,
              fullDb: false,
            })}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            العودة لعرض اليوم فقط
          </Link>
        ) : null}
      </div>
    </div>
  );
}
