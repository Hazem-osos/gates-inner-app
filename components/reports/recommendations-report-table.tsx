"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReportFieldTooltip } from "@/components/reports/report-field-tooltip";
import { cn } from "@/lib/utils";

/** نص المعاينة في التلميح — مثل تقرير B */
function fullCellTooltip(value: string | null | undefined): string {
  const s = value ?? "";
  return s.trim() ? s : "— فارغ —";
}

/** مثل تقارير B / Not B: نص مضغوط، وعند التركيز يكبر لسهولة القراءة والكتابة */
const recTextareaClass = cn(
  "min-h-[2.5rem] min-w-[7rem] max-h-[40rem] max-w-[min(100vw,48rem)] resize-y",
  "border border-border/70 bg-background text-xs leading-snug [color-scheme:inherit] md:text-xs",
  "transition-[font-size,box-shadow,min-width] duration-150",
  "focus:z-20 focus:min-w-[12rem] focus:text-lg focus:font-normal focus:leading-relaxed md:focus:text-lg",
  "focus:shadow-md focus:ring-1 focus:ring-primary/20 dark:border-border/55"
);

const recDateInputClass = cn(
  "w-[140px] text-left text-xs md:text-xs",
  "transition-[font-size] duration-150",
  "focus:z-20 focus:text-lg focus:md:text-lg focus:font-medium"
);

export type RecommendationReportRow = {
  id: string;
  clientId: string;
  clientName: string;
  company: string | null;
  salesName: string | null;
  body: string;
  recommendationDateIso: string | null;
  createdAtIso: string;
  authorName: string;
  workDateIso: string | null;
  actionTaken: string | null;
};

export function RecommendationsReportTable({
  rows,
}: {
  rows: RecommendationReportRow[];
}) {
  return (
    <div className="rounded-xl border border-border/80">
      <TooltipProvider delayDuration={180}>
        <Table containerClassName="max-h-[min(70vh,calc(100vh-11rem))]">
        <TableHeader>
          <TableRow className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[0_1px_0_0_hsl(var(--border))]">
            <TableHead className="w-[6.5rem] max-w-[6.5rem] min-w-[5rem]">
              اسم العميل
            </TableHead>
            <TableHead className="w-[5.5rem] max-w-[6rem] min-w-[4rem]">
              الشركة
            </TableHead>
            <TableHead>موظف السيلز</TableHead>
            <TableHead className="min-w-[200px]">التوصية</TableHead>
            <TableHead>تاريخ التوصية</TableHead>
            <TableHead>اسم المستخدم</TableHead>
            <TableHead>تاريخ العمل بالتوصية</TableHead>
            <TableHead className="min-w-[180px]">الإجراء المتخذ</TableHead>
            <TableHead className="w-[90px]">حفظ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                لا توجد توصيات. تظهر هنا التوصيات المسجّلة من بطاقة العميل أو من عمود «توصيات
                الإدارة» في تقرير B بعد الحفظ.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => <RecommendationEditableRow key={r.id} r={r} />)
          )}
        </TableBody>
        </Table>
      </TooltipProvider>
    </div>
  );
}

function RecommendationEditableRow({ r }: { r: RecommendationReportRow }) {
  const [body, setBody] = useState(r.body);
  const [recDate, setRecDate] = useState(
    (r.recommendationDateIso ?? r.createdAtIso).slice(0, 10)
  );
  const [workDate, setWorkDate] = useState(
    r.workDateIso ? r.workDateIso.slice(0, 10) : ""
  );
  const [actionTaken, setActionTaken] = useState(r.actionTaken ?? "");
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const payload = {
        body,
        recommendationDate: recDate || null,
        workDate: workDate || null,
        actionTaken: actionTaken || null,
      };
      const fromReportB = r.id.startsWith("pending-sync:");
      const res = fromReportB
        ? await fetch("/api/recommendations/from-client-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: r.clientId,
              ...payload,
            }),
          })
        : await fetch(`/api/recommendations/${r.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) {
        toast.error(data.message ?? "فشل الحفظ.");
        return;
      }
      toast.success("تم الحفظ.");
      if (fromReportB) {
        window.location.reload();
      }
    });
  }

  return (
    <TableRow>
      <TableCell className="max-w-[6.5rem] p-2 align-top">
        <Link
          href={`/clients/${r.clientId}`}
          className="line-clamp-2 break-words text-sm text-primary underline"
        >
          {r.clientName}
        </Link>
      </TableCell>
      <TableCell
        className="max-w-[6rem] p-2 align-top text-sm text-muted-foreground"
        title={r.company ?? undefined}
      >
        {r.company?.trim() ? (
          <span className="line-clamp-2 break-words">{r.company}</span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-sm">{r.salesName ?? "—"}</TableCell>
      <TableCell>
        <ReportFieldTooltip tooltip={fullCellTooltip(body)}>
          <Textarea
            rows={3}
            className={cn(recTextareaClass, "min-w-[200px]")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            dir="rtl"
          />
        </ReportFieldTooltip>
      </TableCell>
      <TableCell>
        <ReportFieldTooltip tooltip={fullCellTooltip(recDate)}>
          <Input
            type="date"
            dir="ltr"
            className={recDateInputClass}
            value={recDate}
            onChange={(e) => setRecDate(e.target.value)}
          />
        </ReportFieldTooltip>
      </TableCell>
      <TableCell className="text-muted-foreground">{r.authorName}</TableCell>
      <TableCell>
        <ReportFieldTooltip tooltip={fullCellTooltip(workDate)}>
          <Input
            type="date"
            dir="ltr"
            className={recDateInputClass}
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
          />
        </ReportFieldTooltip>
      </TableCell>
      <TableCell>
        <ReportFieldTooltip tooltip={fullCellTooltip(actionTaken)}>
          <Textarea
            rows={3}
            className={cn(recTextareaClass, "min-w-[180px]")}
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
            dir="rtl"
          />
        </ReportFieldTooltip>
      </TableCell>
      <TableCell>
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? "…" : "حفظ"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
