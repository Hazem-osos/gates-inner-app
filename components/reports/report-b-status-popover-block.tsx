"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClientStatus } from "@prisma/client";

import {
  closeClientFromReport,
  markClientSoldFromReport,
  moveClientToBFromReport,
  moveClientToNotBFromReport,
} from "@/app/actions/report-b-transitions";
import { Button } from "@/components/ui/button";
import { ArabicDateField } from "@/components/ui/arabic-date-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ClassificationRow } from "@/lib/data/classifications";
import { todayInputDate } from "@/lib/date-arabic";
import { sanitizeDisplayLabel } from "@/lib/display-text";
import { reportBSelectTrigger } from "@/lib/report-b-table-helpers";
import { cn } from "@/lib/utils";

export function ReportBStatusPopoverBlock({
  clientId,
  clientStatus,
  classifications,
  open,
  setOpen,
  onDone,
  gateInvalid,
  onBlocked,
  auditReportKey,
}: {
  clientId: string;
  clientStatus?: ClientStatus;
  classifications: ClassificationRow[];
  open: "menu" | "close" | "notb" | "won" | null;
  setOpen: (v: "menu" | "close" | "notb" | "won" | null) => void;
  onDone: (hideId?: string) => void;
  gateInvalid: boolean;
  onBlocked: () => void;
  auditReportKey: string;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [clsId, setClsId] = useState("");
  const [saleVal, setSaleVal] = useState("");
  const [saleDate, setSaleDate] = useState(todayInputDate());
  const [busy, start] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(
    null
  );

  const updateAnchor = useCallback(() => {
    const el = triggerRef.current;
    if (!el || !open) return;
    const rect = el.getBoundingClientRect();
    setAnchor({
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }
    updateAnchor();
  }, [open, updateAnchor]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updateAnchor();
    const onResize = () => updateAnchor();
    window.addEventListener("resize", onResize);
    const scrollRoot = triggerRef.current?.closest("[data-report-b-scroll]");
    scrollRoot?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      scrollRoot?.removeEventListener("scroll", onScroll);
    };
  }, [open, updateAnchor]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      if (t.closest("[data-slot='select-content']")) return;
      setOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const clsLabelById = useMemo(() => {
    const m = new Map<string, { label: string; color: string }>();
    for (const c of classifications) {
      m.set(c.id, {
        label: sanitizeDisplayLabel(c.label),
        color: c.color,
      });
    }
    return m;
  }, [classifications]);

  function guard(e: React.MouseEvent) {
    if (gateInvalid) {
      e.preventDefault();
      onBlocked();
    }
  }

  const panel =
    open && anchor ? (
      <div
        ref={panelRef}
        className="fixed z-[80] w-[min(20rem,calc(100vw-1rem))] rounded-md border border-border bg-popover p-2 text-sm text-popover-foreground shadow-md"
        style={{ top: anchor.top, right: anchor.right }}
        dir="rtl"
      >
        {open === "menu" ? (
          <div className="flex flex-col gap-1.5">
            {clientStatus === ClientStatus.NOT_B ? (
              <button
                type="button"
                className="w-full rounded-md bg-green-100 px-2 py-2 text-center text-sm font-medium text-green-950 hover:bg-green-200 disabled:opacity-50"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    const res = await moveClientToBFromReport(clientId, {
                      reportKey: auditReportKey,
                    });
                    if (res.ok) {
                      toast.success("تم النقل إلى تقرير B");
                      setOpen(null);
                      onDone(clientId);
                      router.push("/reports/b");
                    } else {
                      toast.error(res.message);
                    }
                  })
                }
              >
                {busy ? "جاري…" : "نقل إلى B"}
              </button>
            ) : null}
            <button
              type="button"
              className="w-full rounded-md bg-red-100 px-2 py-2 text-center text-sm font-medium text-red-950 hover:bg-red-200"
              onClick={() => setOpen("close")}
            >
              إغلاق
            </button>
            <button
              type="button"
              className="w-full rounded-md bg-amber-100 px-2 py-2 text-center text-sm font-medium text-amber-950 hover:bg-amber-200"
              onClick={() => setOpen("notb")}
            >
              Not B
            </button>
            <button
              type="button"
              className="w-full rounded-md bg-emerald-100 px-2 py-2 text-center text-sm font-medium text-emerald-950 hover:bg-emerald-200"
              onClick={() => setOpen("won")}
            >
              تم البيع
            </button>
            <button
              type="button"
              className="mt-1 w-full text-center text-xs text-muted-foreground underline"
              onClick={() => setOpen(null)}
            >
              إغلاق اللوحة
            </button>
          </div>
        ) : null}
        {open === "close" ? (
          <div className="flex flex-col gap-2">
            <Textarea
              placeholder="سبب الإغلاق"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              dir="rtl"
            />
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                className="flex-1"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    const res = await closeClientFromReport(clientId, reason, {
                      reportKey: auditReportKey,
                    });
                    if (res.ok) {
                      toast.success("تم الإغلاق");
                      onDone(clientId);
                    } else toast.error(res.message);
                  })
                }
              >
                تنفيذ
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setOpen("menu")}
              >
                إلغاء
              </Button>
            </div>
          </div>
        ) : null}
        {open === "notb" ? (
          <div className="flex flex-col gap-2">
            <Select
              value={clsId || "__none__"}
              onValueChange={(v) => setClsId(!v || v === "__none__" ? "" : v)}
            >
              <SelectTrigger
                className={cn(reportBSelectTrigger, "h-9 w-full")}
                dir="rtl"
              >
                <SelectValue placeholder="التصنيف">
                  {(v) => {
                    if (v == null || v === "" || v === "__none__") {
                      return "التصنيف";
                    }
                    const row = clsLabelById.get(String(v));
                    if (!row) {
                      return <bdi>{sanitizeDisplayLabel(String(v))}</bdi>;
                    }
                    return (
                      <span
                        className="flex min-w-0 flex-1 items-center gap-1.5"
                        dir="rtl"
                      >
                        <span
                          className="inline-block size-3 shrink-0 rounded-sm border border-border"
                          style={{ backgroundColor: row.color }}
                          aria-hidden
                        />
                        <bdi className="min-w-0 truncate">{row.label}</bdi>
                      </span>
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" label="—">
                  —
                </SelectItem>
                {classifications.map((c) => {
                  const lab = sanitizeDisplayLabel(c.label);
                  return (
                    <SelectItem key={c.id} value={c.id} label={lab}>
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="inline-block size-3 shrink-0 rounded-sm border border-border"
                          style={{ backgroundColor: c.color }}
                          aria-hidden
                        />
                        <bdi className="min-w-0 truncate">{lab}</bdi>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                className="flex-1"
                disabled={busy || !clsId}
                onClick={() =>
                  start(async () => {
                    const res = await moveClientToNotBFromReport(
                      clientId,
                      clsId,
                      { reportKey: auditReportKey }
                    );
                    if (res.ok) {
                      toast.success("تم النقل");
                      onDone(clientId);
                    } else toast.error(res.message);
                  })
                }
              >
                تنفيذ
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setOpen("menu")}
              >
                إلغاء
              </Button>
            </div>
          </div>
        ) : null}
        {open === "won" ? (
          <div className="flex flex-col gap-2">
            <Input
              placeholder="قيمة البيع"
              dir="ltr"
              className="text-left"
              value={saleVal}
              onChange={(e) => setSaleVal(e.target.value)}
            />
            <ArabicDateField
              valueYmd={saleDate}
              allowEmpty={false}
              className="w-full"
              buttonClassName="h-9 w-full text-sm font-semibold"
              onValueChange={(ymd) => setSaleDate(ymd || todayInputDate())}
            />
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                className="flex-1"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    const res = await markClientSoldFromReport(
                      clientId,
                      saleVal,
                      new Date(saleDate + "T12:00:00").toISOString(),
                      { reportKey: auditReportKey }
                    );
                    if (res.ok) {
                      toast.success("تم تسجيل البيع");
                      onDone(clientId);
                    } else toast.error(res.message);
                  })
                }
              >
                تنفيذ
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setOpen("menu")}
              >
                إلغاء
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div
      data-gate-exempt
      className="relative z-20 text-[10px]"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        ref={triggerRef}
        type="button"
        size="sm"
        className="h-7 w-full border-emerald-700 bg-emerald-600 px-1 text-white hover:bg-emerald-700"
        onClick={(e) => {
          guard(e);
          setOpen(open ? null : "menu");
        }}
      >
        حالة
      </Button>
      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
}
