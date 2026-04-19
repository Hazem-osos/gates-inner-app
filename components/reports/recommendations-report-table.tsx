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

export type RecommendationReportRow = {
  id: string;
  clientId: string;
  clientName: string;
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
    <div className="overflow-x-auto rounded-xl border border-border/80">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[130px]">اسم العميل</TableHead>
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
          {rows.map((r) => (
            <RecommendationEditableRow key={r.id} r={r} />
          ))}
        </TableBody>
      </Table>
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
      const res = await fetch(`/api/recommendations/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          recommendationDate: recDate || null,
          workDate: workDate || null,
          actionTaken: actionTaken || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) {
        toast.error(data.message ?? "فشل الحفظ.");
        return;
      }
      toast.success("تم الحفظ.");
    });
  }

  return (
    <TableRow>
      <TableCell>
        <Link href={`/clients/${r.clientId}`} className="text-primary underline">
          {r.clientName}
        </Link>
      </TableCell>
      <TableCell>{r.salesName ?? "—"}</TableCell>
      <TableCell>
        <Textarea
          rows={3}
          className="min-w-[200px] text-xs"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          dir="rtl"
        />
      </TableCell>
      <TableCell>
        <Input
          type="date"
          dir="ltr"
          className="w-[140px] text-left text-xs"
          value={recDate}
          onChange={(e) => setRecDate(e.target.value)}
        />
      </TableCell>
      <TableCell className="text-muted-foreground">{r.authorName}</TableCell>
      <TableCell>
        <Input
          type="date"
          dir="ltr"
          className="w-[140px] text-left text-xs"
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
        />
      </TableCell>
      <TableCell>
        <Textarea
          rows={3}
          className="min-w-[160px] text-xs"
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
          dir="rtl"
        />
      </TableCell>
      <TableCell>
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? "…" : "حفظ"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
