"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatDateArabicLong } from "@/lib/date-arabic";

export type WarmingReportRow = {
  clientId: string;
  clientName: string;
  activity: string | null;
  phone: string;
  contactDateIso: string | null;
  warmingText: string | null;
  day2Text: string | null;
  day3Text: string | null;
  day1Done: boolean;
  day2Done: boolean;
  day3Done: boolean;
};

export function WarmingReportTable({ rows }: { rows: WarmingReportRow[] }) {
  return (
    <div className="rounded-xl border border-border/80">
      <Table containerClassName="max-h-[min(70vh,calc(100vh-11rem))]">
        <TableHeader>
          <TableRow className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[0_1px_0_0_hsl(var(--border))]">
            <TableHead>اسم العميل</TableHead>
            <TableHead>النشاط</TableHead>
            <TableHead>تاريخ الاتصال</TableHead>
            <TableHead dir="ltr">الهاتف</TableHead>
            <TableHead className="min-w-[220px]">اليوم الأول</TableHead>
            <TableHead className="min-w-[220px]">اليوم الثاني</TableHead>
            <TableHead className="min-w-[220px]">اليوم الثالث</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <WarmingRow key={r.clientId} initial={r} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function parseDayDates(contactIso: string | null): {
  d1: Date | null;
  d2: Date | null;
  d3: Date | null;
} {
  if (!contactIso) return { d1: null, d2: null, d3: null };
  const c = new Date(contactIso);
  if (Number.isNaN(c.getTime())) return { d1: null, d2: null, d3: null };
  const y = c.getFullYear();
  const m = c.getMonth();
  const d = c.getDate();
  const base = new Date(y, m, d);
  const d2 = new Date(y, m, d + 1);
  const d3 = new Date(y, m, d + 2);
  return { d1: base, d2, d3 };
}

function WarmingRow({ initial }: { initial: WarmingReportRow }) {
  const [warmingText, setWarmingText] = useState(initial.warmingText ?? "");
  const [day2Text, setDay2Text] = useState(initial.day2Text ?? "");
  const [day3Text, setDay3Text] = useState(initial.day3Text ?? "");
  const [day1Done, setDay1Done] = useState(initial.day1Done);
  const [day2Done, setDay2Done] = useState(initial.day2Done);
  const [day3Done, setDay3Done] = useState(initial.day3Done);
  const [pending, start] = useTransition();

  const { d1, d2, d3 } = parseDayDates(initial.contactDateIso);

  function patch(payload: Record<string, unknown>) {
    start(async () => {
      const res = await fetch(`/api/warming/${initial.clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) toast.error(data.message ?? "فشل الحفظ.");
      else toast.success("تم الحفظ.");
    });
  }

  function setDone(day: 1 | 2 | 3, done: boolean) {
    if (day === 1) setDay1Done(done);
    if (day === 2) setDay2Done(done);
    if (day === 3) setDay3Done(done);
    patch({
      ...(day === 1 ? { day1Done: done } : {}),
      ...(day === 2 ? { day2Done: done } : {}),
      ...(day === 3 ? { day3Done: done } : {}),
    });
  }

  function saveText() {
    patch({ clientWarmingText: warmingText });
  }

  function saveDay2() {
    patch({ day2Content: day2Text });
  }

  function saveDay3() {
    patch({ day3Content: day3Text });
  }

  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/clients/${initial.clientId}`}
          className="text-primary underline"
        >
          {initial.clientName}
        </Link>
      </TableCell>
      <TableCell className="max-w-[140px] truncate text-xs">
        {initial.activity ?? "—"}
      </TableCell>
      <TableCell dir="ltr" className="text-xs whitespace-nowrap">
        {initial.contactDateIso
          ? formatDateArabicLong(new Date(initial.contactDateIso))
          : "—"}
      </TableCell>
      <TableCell dir="ltr" className="text-xs">
        {initial.phone}
      </TableCell>
      <TableCell className="align-top text-xs">
        <Textarea
          rows={3}
          className="mb-2 text-xs"
          dir="rtl"
          value={warmingText}
          disabled={pending}
          onChange={(e) => setWarmingText(e.target.value)}
          onBlur={() => saveText()}
        />
        <DoneRadio value={day1Done} onChange={(v) => setDone(1, v)} />
      </TableCell>
      <TableCell className="align-top text-xs">
        <p dir="ltr" className="mb-2 font-medium">
          {d2 ? formatDateArabicLong(d2) : "—"}
        </p>
        <Textarea
          rows={3}
          className="mb-2 text-xs"
          dir="rtl"
          value={day2Text}
          disabled={pending}
          onChange={(e) => setDay2Text(e.target.value)}
          onBlur={() => saveDay2()}
        />
        <DoneRadio value={day2Done} onChange={(v) => setDone(2, v)} />
      </TableCell>
      <TableCell className="align-top text-xs">
        <p dir="ltr" className="mb-2 font-medium">
          {d3 ? formatDateArabicLong(d3) : "—"}
        </p>
        <Textarea
          rows={3}
          className="mb-2 text-xs"
          dir="rtl"
          value={day3Text}
          disabled={pending}
          onChange={(e) => setDay3Text(e.target.value)}
          onBlur={() => saveDay3()}
        />
        <DoneRadio value={day3Done} onChange={(v) => setDone(3, v)} />
      </TableCell>
    </TableRow>
  );
}

function DoneRadio({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (done: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button
        type="button"
        size="sm"
        variant={value === true ? "default" : "outline"}
        className="h-8 px-2 text-xs"
        onClick={() => onChange(true)}
      >
        تم
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === false ? "secondary" : "outline"}
        className="h-8 px-2 text-xs"
        onClick={() => onChange(false)}
      >
        لم يتم
      </Button>
    </div>
  );
}
