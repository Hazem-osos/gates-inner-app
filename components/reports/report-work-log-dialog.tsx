"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import type { AuditWorkClientGroup } from "@/lib/audit/work-log-types";
import { formatDateTimeArabic, todayInputDate } from "@/lib/date-arabic";
import { cn } from "@/lib/utils";

type Props = {
  /** مفتاح التقرير لتصفية السجلات (مثل report-b، report-won) */
  reportKey: string;
  userId: string;
  className?: string;
};

export function ReportWorkLogDialog({
  reportKey,
  userId,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [auditFrom, setAuditFrom] = useState(todayInputDate());
  const [auditTo, setAuditTo] = useState(todayInputDate());
  const [auditGroups, setAuditGroups] = useState<AuditWorkClientGroup[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = todayInputDate();
    setAuditFrom(t);
    setAuditTo(t);
  }, [open]);

  const loadAudit = useCallback(async () => {
    if (!userId) return;
    setAuditLoading(true);
    try {
      const p = new URLSearchParams({
        from: `${auditFrom}T00:00:00`,
        to: `${auditTo}T23:59:59`,
        userId,
        reportKey,
      });
      const res = await fetch(`/api/audit-log?${p.toString()}`);
      const data = (await res.json()) as {
        groups?: AuditWorkClientGroup[];
        message?: string;
      };
      if (!res.ok) {
        setAuditGroups([]);
      } else {
        setAuditGroups(data.groups ?? []);
      }
    } catch {
      setAuditGroups([]);
    } finally {
      setAuditLoading(false);
    }
  }, [auditFrom, auditTo, userId, reportKey]);

  return (
    <>
      <Button
        type="button"
        className={cn("bg-black text-white hover:bg-black/90", className)}
        onClick={() => setOpen(true)}
      >
        سجل العمل
      </Button>

      <SimpleDialog
        open={open}
        onOpenChange={setOpen}
        title="سجل العمل"
        contentClassName="max-w-[min(96vw,1320px)] w-[min(96vw,1320px)]"
        closeOnBackdrop={false}
        closeOnEscape={false}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              إغلاق
            </Button>
            <Button type="button" onClick={() => void loadAudit()} disabled={auditLoading}>
              {auditLoading ? "جاري…" : "موافق"}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-xs text-muted-foreground" dir="rtl">
          يعرض إجراءاتك على العملاء المرتبطة بهذا التقرير فقط ضمن الفترة المختارة.
        </p>
        <div className="grid gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 md:grid-cols-2 md:gap-6">
          <label className="grid gap-2 text-xs font-medium text-foreground">
            من تاريخ
            <Input
              type="date"
              dir="ltr"
              className="h-10 border-border/80 bg-background"
              value={auditFrom}
              onChange={(e) => setAuditFrom(e.target.value)}
            />
          </label>
          <label className="grid gap-2 text-xs font-medium text-foreground">
            إلى تاريخ
            <Input
              type="date"
              dir="ltr"
              className="h-10 border-border/80 bg-background"
              value={auditTo}
              onChange={(e) => setAuditTo(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-5 max-h-[min(70vh,620px)] overflow-auto rounded-2xl border border-border/70 bg-gradient-to-b from-muted/30 to-background p-1 shadow-inner">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-muted/70 text-sm font-semibold tracking-tight text-foreground">
                <th className="sticky top-0 z-[1] w-[min(22%,11rem)] border-b border-border/80 p-3 text-center shadow-[0_1px_0_0_hsl(var(--border))]">
                  العميل
                </th>
                <th className="sticky top-0 z-[1] w-[min(22%,11rem)] border-b border-border/80 p-3 text-center shadow-[0_1px_0_0_hsl(var(--border))]">
                  الشركة
                </th>
                <th className="sticky top-0 z-[1] border-b border-border/80 p-3 text-center shadow-[0_1px_0_0_hsl(var(--border))]">
                  سجل الإجراءات (مرتب بالزمن)
                </th>
              </tr>
            </thead>
            <tbody>
              {auditGroups.map((g, gi) => (
                <tr
                  key={g.clientId}
                  className={cn(
                    "align-top transition-colors",
                    gi > 0 && "border-t-[10px] border-t-muted/40",
                    gi % 2 === 0 ? "bg-background/50" : "bg-muted/20"
                  )}
                >
                  <td className="border-b border-border/50 p-4 align-top font-semibold text-foreground first:border-s-0">
                    {g.clientName}
                  </td>
                  <td className="border-b border-border/50 p-4 align-top text-sm text-muted-foreground first:border-s-0">
                    {g.company?.trim() ? g.company : "—"}
                  </td>
                  <td className="border-b border-border/50 p-4 align-top first:border-s-0">
                    <ul className="flex flex-col gap-4">
                      {g.events.map((ev) => (
                        <li
                          key={ev.id}
                          className="overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-md ring-1 ring-border/25"
                        >
                          <div className="border-b border-border/50 bg-muted/40 px-3 py-2">
                            <p
                              className="inline-flex items-center rounded-full bg-background/90 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground ring-1 ring-border/60"
                              dir="ltr"
                            >
                              {formatDateTimeArabic(new Date(ev.createdAt))}
                            </p>
                          </div>
                          <ul className="flex flex-col gap-2 p-3">
                            {ev.lines.map((ln, i) => (
                              <li
                                key={i}
                                className="rounded-lg border border-border/55 bg-background/90 px-3 py-2.5 text-sm leading-relaxed text-foreground shadow-[0_1px_0_0_hsl(var(--border)/0.35)]"
                              >
                                {ln}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditGroups.length === 0 && !auditLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              لا توجد سجلات لهذا التقرير في الفترة — اضغط موافق بعد اختيار التواريخ.
            </p>
          ) : null}
        </div>
      </SimpleDialog>
    </>
  );
}
