"use client";

import { getDaysInMonth } from "date-fns";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { CalendarDays, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ARABIC_CALENDAR_MONTHS,
  formatDateArabicLong,
} from "@/lib/date-arabic";
import { parseIsoDate } from "@/lib/report-b-utils";
import { cn } from "@/lib/utils";

export type ArabicDateFieldProps = {
  /** قيمة الحقل ‎yyyy-MM-dd‎ أو فارغ */
  valueYmd: string;
  onValueChange: (ymd: string) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  /** نسخة مدمجة للنماذج: عرض أقصى للوحة ولون خط أصغر */
  compact?: boolean;
  /** عند ‎true‎ يُسمح بزر «مسح» */
  allowEmpty?: boolean;
  /** نص الزر عند عدم وجود تاريخ */
  emptyLabel?: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function ArabicDateField({
  valueYmd,
  onValueChange,
  disabled,
  className,
  buttonClassName,
  compact = false,
  allowEmpty = true,
  emptyLabel = "اختر التاريخ",
}: ArabicDateFieldProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const [y, setY] = useState("");
  const [m, setM] = useState("");
  const [d, setD] = useState("");

  const nowY = new Date().getFullYear();
  const yearOpts = useMemo(() => {
    const out: number[] = [];
    for (let yy = nowY - 20; yy <= nowY + 12; yy++) out.push(yy);
    return out;
  }, [nowY]);

  const yi = y ? parseInt(y, 10) : NaN;
  const mi = m ? parseInt(m, 10) : NaN;
  const dim =
    Number.isFinite(yi) && Number.isFinite(mi) && mi >= 1 && mi <= 12
      ? getDaysInMonth(new Date(yi, mi - 1, 1))
      : 31;

  const dayOpts = useMemo(() => {
    const n = Number.isFinite(dim) ? dim : 31;
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [dim]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const minPopover = compact ? 152 : 220;
    const maxPopoverW = compact ? 208 : 560;
    let w = Math.max(r.width, minPopover);
    w = Math.min(w, maxPopoverW);
    let left = r.left;
    const pad = 8;
    if (left + w + pad > window.innerWidth) {
      left = Math.max(pad, window.innerWidth - w - pad);
    }
    setAnchor({
      top: r.bottom + 4,
      left,
      width: w,
    });
  }, [open, compact]);

  useLayoutEffect(() => {
    if (!open) return;
    const parsed =
      valueYmd && /^\d{4}-\d{2}-\d{2}$/.test(valueYmd)
        ? parseIsoDate(valueYmd)
        : null;
    if (parsed) {
      setY(String(parsed.getFullYear()));
      setM(String(parsed.getMonth() + 1));
      setD(String(parsed.getDate()));
    } else {
      const t = new Date();
      setY(String(t.getFullYear()));
      setM(String(t.getMonth() + 1));
      setD(String(t.getDate()));
    }
  }, [open, valueYmd]);

  useEffect(() => {
    if (!y || !m || !d) return;
    const yyn = parseInt(y, 10);
    const mmn = parseInt(m, 10);
    const ddn = parseInt(d, 10);
    if (!Number.isFinite(yyn) || !Number.isFinite(mmn) || !Number.isFinite(ddn))
      return;
    const maxD = getDaysInMonth(new Date(yyn, mmn - 1, 1));
    if (ddn > maxD) setD(String(maxD));
  }, [y, m, d]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPtr = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPtr, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPtr, true);
    };
  }, [open]);

  const displayLabel = useMemo(() => {
    if (!valueYmd?.trim()) return emptyLabel;
    const parsed = parseIsoDate(valueYmd);
    if (!parsed) return emptyLabel;
    return formatDateArabicLong(parsed);
  }, [valueYmd, emptyLabel]);

  const apply = useCallback(() => {
    if (!y || !m || !d) return;
    const ymd = `${y}-${pad2(parseInt(m, 10))}-${pad2(parseInt(d, 10))}`;
    if (!parseIsoDate(ymd)) return;
    onValueChange(ymd);
    setOpen(false);
  }, [y, m, d, onValueChange]);

  const clear = useCallback(() => {
    if (!allowEmpty) return;
    onValueChange("");
    setOpen(false);
  }, [allowEmpty, onValueChange]);

  const monthDisabled = !y;
  const dayDisabled = !y || !m;

  const panel =
    open && anchor && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[300]"
            style={{ pointerEvents: "none" }}
            aria-hidden
          >
            <div
              id={panelId}
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="اختيار التاريخ"
              className={cn(
                "fixed z-[301] rounded-xl border border-border bg-card shadow-xl",
                compact ? "p-1.5" : "p-2"
              )}
              style={{
                pointerEvents: "auto",
                top: anchor.top,
                left: anchor.left,
                width: anchor.width,
                maxHeight: compact ? "min(65vh, 300px)" : "min(70vh, 380px)",
                overflowY: "auto",
              }}
              dir="rtl"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <p
                className={cn(
                  "font-semibold text-muted-foreground",
                  compact
                    ? "mb-1 text-[10px] leading-tight"
                    : "mb-2 text-xs"
                )}
              >
                اختر بالتتابع: السنة، ثم الشهر، ثم اليوم
              </p>
              <div className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2")}>
                <label className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      "font-medium text-foreground",
                      compact ? "text-[10px]" : "text-[11px]"
                    )}
                  >
                    ١ — السنة
                  </span>
                  <select
                    className={cn(
                      "w-full rounded-lg border border-input bg-background",
                      compact
                        ? "h-7 px-1.5 text-xs"
                        : "h-9 px-2 text-sm"
                    )}
                    value={y}
                    onChange={(e) => {
                      setY(e.target.value);
                      setM("");
                      setD("");
                    }}
                  >
                    <option value="">— اختر السنة —</option>
                    {yearOpts.map((yy) => (
                      <option key={yy} value={String(yy)}>
                        {yy}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      "font-medium text-foreground",
                      compact ? "text-[10px]" : "text-[11px]"
                    )}
                  >
                    ٢ — الشهر
                  </span>
                  <select
                    className={cn(
                      "w-full rounded-lg border border-input bg-background disabled:opacity-50",
                      compact
                        ? "h-7 px-1.5 text-xs"
                        : "h-9 px-2 text-sm"
                    )}
                    disabled={monthDisabled}
                    value={m}
                    onChange={(e) => {
                      setM(e.target.value);
                      setD("");
                    }}
                  >
                    <option value="">— اختر الشهر —</option>
                    {ARABIC_CALENDAR_MONTHS.map((name, idx) => (
                      <option key={name} value={String(idx + 1)}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      "font-medium text-foreground",
                      compact ? "text-[10px]" : "text-[11px]"
                    )}
                  >
                    ٣ — اليوم
                  </span>
                  <select
                    className={cn(
                      "w-full rounded-lg border border-input bg-background disabled:opacity-50",
                      compact
                        ? "h-7 px-1.5 text-xs"
                        : "h-9 px-2 text-sm"
                    )}
                    disabled={dayDisabled}
                    value={d}
                    onChange={(e) => setD(e.target.value)}
                  >
                    <option value="">— اختر اليوم —</option>
                    {dayOpts.map((dd) => (
                      <option key={dd} value={String(dd)}>
                        {dd}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div
                className={cn(
                  "flex flex-wrap",
                  compact ? "mt-2 gap-1.5" : "mt-3 gap-2"
                )}
              >
                <Button
                  type="button"
                  size={compact ? "xs" : "sm"}
                  className="flex-1"
                  disabled={!y || !m || !d}
                  onClick={apply}
                >
                  تم
                </Button>
                {allowEmpty ? (
                  <Button
                    type="button"
                    size={compact ? "xs" : "sm"}
                    variant="secondary"
                    onClick={clear}
                  >
                    مسح
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size={compact ? "xs" : "sm"}
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  const triggerTitle =
    valueYmd?.trim() && displayLabel !== emptyLabel
      ? `${displayLabel} — اضغط لتغيير التاريخ`
      : "اضغط لفتح اختيار التاريخ (اليوم افتراضياً)";

  return (
    <div className={cn("relative inline-flex w-full min-w-0", className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        disabled={disabled}
        title={triggerTitle}
        className={cn(
          "h-auto min-h-8 w-full cursor-pointer justify-center gap-1.5 px-2 py-1 text-center text-xs font-semibold leading-snug whitespace-normal shadow-sm sm:text-sm",
          compact &&
            "min-h-7 gap-1 px-1.5 py-0.5 text-[11px] leading-tight sm:text-xs",
          !valueYmd?.trim() &&
            "border-dashed border-muted-foreground/45 font-normal text-muted-foreground hover:border-primary/55 hover:bg-muted/40",
          buttonClassName
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen((v) => !v);
        }}
      >
        <CalendarDays
          className={cn(
            "shrink-0 self-center text-primary/80",
            compact ? "size-3 sm:size-3.5" : "size-3.5 sm:size-4"
          )}
          aria-hidden
        />
        {/* عرض: رقم اليوم + اسم الشهر العربي + السنة (formatDateArabicLong) */}
        <span className="min-w-0 flex-1 wrap-break-word text-pretty">
          {displayLabel}
        </span>
        <ChevronDown
          className={cn(
            "shrink-0 self-center text-muted-foreground transition-transform duration-200",
            compact ? "size-3 sm:size-3.5" : "size-3.5 sm:size-4",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </Button>
      {panel}
    </div>
  );
}
