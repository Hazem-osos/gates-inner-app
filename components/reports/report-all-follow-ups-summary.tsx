"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { formatDateArabicLong } from "@/lib/date-arabic";
import type { ReportBFollowSlot } from "@/lib/report-b-table-helpers";
import { parseIsoDate } from "@/lib/report-b-utils";

type ApiItem = {
  id: string;
  interactionAt: string;
  notes: string;
  followUpStatus: string | null;
  authorName: string;
};

type ListEntry = {
  key: string;
  sortMs: number;
  seq: number;
  dateLine: string;
  body: string;
  sourceLabel: string;
};

const NO_SLOT_DATE_SORT_MS = 9_000_000_000_000_000;

function buildEntries(
  slots: ReportBFollowSlot[],
  apiItems: ApiItem[]
): ListEntry[] {
  const out: ListEntry[] = [];
  let seq = 0;

  for (const s of slots) {
    const note = (s.note ?? "").trim();
    const dateStr = (s.date ?? "").trim();
    if (!note && !dateStr) continue;

    const d = parseIsoDate(dateStr || null);
    const sortMs = d ? d.getTime() : NO_SLOT_DATE_SORT_MS + s.order;
    const dateLine = d ? formatDateArabicLong(d) : "بدون تاريخ في عمود المتابعة";
    const body = note || "—";
    out.push({
      key: `slot-${s.order}-${seq}`,
      sortMs,
      seq: seq++,
      dateLine,
      body,
      sourceLabel: `متابعة ${s.order} · من أعمدة التقرير`,
    });
  }

  for (const it of apiItems) {
    const d = new Date(it.interactionAt);
    const sortMs = Number.isNaN(d.getTime()) ? NO_SLOT_DATE_SORT_MS + seq : d.getTime();
    let body = (it.notes ?? "").trim() || "—";
    if (it.followUpStatus?.trim()) {
      body = `${body}\nالحالة: ${it.followUpStatus.trim()}`;
    }
    out.push({
      key: `int-${it.id}`,
      sortMs,
      seq: seq++,
      dateLine: Number.isNaN(d.getTime()) ? "—" : formatDateArabicLong(d),
      body,
      sourceLabel:
        it.authorName && it.authorName !== "—"
          ? `متابعة مسجّلة · ${it.authorName}`
          : "متابعة مسجّلة",
    });
  }

  out.sort((a, b) => a.sortMs - b.sortMs || a.seq - b.seq);
  return out;
}

type Props = {
  clientId: string;
  /** اسم المسؤول (عمود التقرير) */
  clientName: string;
  /** اسم الشركة */
  company: string | null;
  slots: ReportBFollowSlot[];
  disabled?: boolean;
};

export function ReportAllFollowUpsSummaryButton({
  clientId,
  clientName,
  company,
  slots,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiItems, setApiItems] = useState<ApiItem[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/follow-ups-log`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => null)) as
        | { items?: ApiItem[]; message?: string }
        | null;
      if (!res.ok) {
        setApiItems([]);
        setError(
          typeof data?.message === "string"
            ? data.message
            : "تعذر تحميل المتابعات المسجّلة."
        );
        return;
      }
      setApiItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setApiItems([]);
      setError("تعذر تحميل المتابعات المسجّلة.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const entries = useMemo(
    () => buildEntries(slots, apiItems ?? []),
    [slots, apiItems]
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-full min-w-0 shrink-0 border-[#153a5f] bg-[#1e3a5f] px-1.5 text-[11px] font-semibold leading-tight text-white shadow-sm hover:bg-[#162f50] hover:text-white focus-visible:ring-[#1e3a5f] disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
        disabled={disabled}
        title="عرض أعمدة المتابعة في التقرير إلى جانب المتابعات المسجّلة من بطاقة العميل"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        عرض الكل
      </Button>

      <SimpleDialog
        open={open}
        onOpenChange={setOpen}
        title={clientName.trim() || "—"}
        description={
          <span dir="rtl">
            متابع —{" "}
            <bdi dir="auto" className="text-foreground">
              {(company ?? "").trim() || "—"}
            </bdi>
          </span>
        }
        contentClassName="max-w-xl"
      >
        {loading ? (
          <p className="text-muted-foreground">جاري التحميل…</p>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground">
            لا توجد متابعات بأعمدة التقرير ولا في سجل المتابعات المسجّلة لهذا
            العميل.
          </p>
        ) : (
          <ul className="space-y-0">
            {entries.map((ent, i) => (
              <Fragment key={ent.key}>
                {i > 0 ? (
                  <Separator className="my-4 bg-border/70" />
                ) : null}
                <li className="space-y-1.5">
                  <p
                    className="text-xs font-semibold text-muted-foreground"
                    dir="ltr"
                  >
                    {ent.dateLine}
                  </p>
                  <p className="text-[11px] text-muted-foreground/90">
                    {ent.sourceLabel}
                  </p>
                  <p className="whitespace-pre-wrap wrap-break-word text-foreground" dir="auto">
                    {ent.body}
                  </p>
                </li>
              </Fragment>
            ))}
          </ul>
        )}
      </SimpleDialog>
    </>
  );
}
