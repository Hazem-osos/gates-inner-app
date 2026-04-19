"use client";

import { ClientStatus } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import {
  closeClientFromReport,
  markClientSoldFromReport,
  moveClientToNotBFromReport,
  reopenClosedClientFromReport,
} from "@/app/actions/report-b-transitions";
import {
  patchClientReportFields,
  type ReportClientPatchInput,
} from "@/app/actions/report-client-patch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { formatDateTimeArabic } from "@/lib/date-arabic";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { ClassificationRow } from "@/lib/data/classifications";
import { formatDateArabicLong, todayInputDate } from "@/lib/date-arabic";
import { daysElapsedSinceContact } from "@/lib/days-elapsed";
import {
  matchesSearch,
  passesActuallyVisited,
  passesDaysOver,
  passesFollowCount,
  passesNeglected,
  passesNoAnswerFilter,
  passesVisitOverdue,
  passesVisitScheduledOnly,
  REPORT_B_PALETTE,
  sortRows,
  startOfToday,
  type SortTriState,
  type ViolationKind,
} from "@/lib/report-b-utils";
import { cn } from "@/lib/utils";

/** Compact default; user can resize textareas via corner handle. */
const reportBInput =
  "h-8 min-w-[6.5rem] border border-border/70 bg-background text-xs leading-snug [color-scheme:inherit] dark:border-border/55";
/** Resizable (drag corner) so users can enlarge/shrink while typing. */
const reportBTextarea =
  "min-h-[2rem] min-w-[7rem] max-h-[36rem] max-w-[min(100vw,42rem)] resize border border-border/70 bg-background text-xs leading-snug [color-scheme:inherit] dark:border-border/55";
const reportBSelectTrigger =
  "h-8 min-w-[6.5rem] border border-border/70 text-xs dark:border-border/55";

export type ReportBRow = {
  id: string;
  name: string;
  phone: string;
  phone2: string | null;
  company: string | null;
  position: string | null;
  address: string | null;
  activity: string | null;
  status: ClientStatus;
  initialCallDate: string | null;
  nextFollowUpAt: string | null;
  quotePrice: string | null;
  quoteDetail: string | null;
  managementRecommendationText: string | null;
  managementRecommendationDate: string | null;
  currentSituation: string | null;
  adPlatform: string | null;
  sourceAdName: string | null;
  callSummary: string | null;
  salesNotes: string | null;
  finalStatusNote: string | null;
  clientWarmingText: string | null;
  visitAppointmentScheduled: boolean;
  visitAppointmentDate: string | null;
  presentingEmployeeName: string | null;
  qqAnswer: boolean | null;
  assignedUserName: string | null;
  classificationId: string | null;
  classificationLabel: string | null;
  classificationColor: string | null;
  followUpSlots: unknown;
  /** عميل مغلق — للعرض في تقرير المغلقة فقط */
  closedLostAt?: string | null;
  lossReason?: string | null;
};

type Props = {
  rows: ReportBRow[];
  classifications: ClassificationRow[];
  rowStyles?: Record<string, { color: string; legendNote?: string }>;
  /** مطلوب لسجل العمل وسجل لوحة الألوان */
  currentUserId?: string;
  /** لـ PATCH تلوين الصف (مثلاً not-b) */
  rowStyleReportType?: "b" | "not-b";
  /** تقرير المغلقة: شبكة كاملة بدون أدوات الفلترة العلوية من تقرير B */
  toolbar?: "full" | "closed";
};

type FollowSlot = { order: number; note: string; date: string };

function normalizeSlots(raw: unknown): FollowSlot[] {
  if (!Array.isArray(raw)) return [];
  const out: FollowSlot[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as Record<string, unknown>;
    if (typeof item !== "object" || item === null) continue;
    out.push({
      order: typeof item.order === "number" ? item.order : i + 1,
      note: typeof item.note === "string" ? item.note : "",
      date: typeof item.date === "string" ? item.date : "",
    });
  }
  return out.sort((a, b) => a.order - b.order);
}

function slotsToJson(slots: FollowSlot[]): unknown {
  return slots.map((s, i) => ({ ...s, order: i + 1 }));
}

function mergedCallAndSituation(call: string | null, sit: string | null): string {
  const a = (call ?? "").trim();
  const b = (sit ?? "").trim();
  if (!a && !b) return "";
  if (!a) return b;
  if (!b) return a;
  return `${a}\n---\n${b}`;
}

function splitCallAndSituation(combined: string): {
  callSummary: string;
  currentSituation: string;
} {
  const sep = "\n---\n";
  if (!combined.includes(sep)) {
    return { callSummary: combined, currentSituation: "" };
  }
  const [callSummary, ...rest] = combined.split(sep);
  return { callSummary, currentSituation: rest.join(sep) };
}

function serializeRowStyleMap(
  m: Record<string, { color: string; legendNote?: string }>
): string {
  return JSON.stringify(
    Object.entries(m)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, v]) => [id, v.color, v.legendNote ?? ""])
  );
}

function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return `rgba(0,0,0,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function nextFollowUpMeetsGate(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d >= startOfToday();
}

export function ReportBTable({
  rows,
  classifications,
  rowStyles: rowStylesProp = {},
  currentUserId = "",
  rowStyleReportType = "b",
  toolbar = "full",
}: Props) {
  const router = useRouter();
  const [pending] = useTransition();
  const [local, setLocal] = useState<Record<string, Partial<ReportBRow>>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const reportBScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollReportBHorizontal = useCallback((direction: -1 | 1) => {
    const root = reportBScrollRef.current;
    if (!root) return;
    /** `Table` wraps `<table>` in an inner div that actually scrolls horizontally. */
    const el =
      root.querySelector<HTMLElement>('[data-slot="table-container"]') ?? root;
    if (el.scrollWidth <= el.clientWidth + 1) return;
    const step = Math.max(280, Math.round(el.clientWidth * 0.42));
    const rtl = getComputedStyle(el).direction === "rtl";
    const leftDelta = (rtl ? -1 : 1) * direction * step;
    el.scrollBy({ left: leftDelta, behavior: "smooth" });
  }, []);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [reopeningClientId, setReopeningClientId] = useState<string | null>(
    null
  );
  const [styleMap, setStyleMap] =
    useState<Record<string, { color: string; legendNote?: string }>>(rowStylesProp);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [legends, setLegends] = useState<Record<string, string>>({});

  /** تقرير Not B: لا يُعرض صف مسار B في قائمة التصنيف لتفادي قوائم فارغة/قيم غير مطابقة */
  const tableClassificationOptions = useMemo(
    () =>
      rowStyleReportType === "not-b"
        ? classifications.filter((c) => !c.isBRow)
        : classifications,
    [rowStyleReportType, classifications]
  );

  const [searchQ, setSearchQ] = useState("");
  const [violation, setViolation] = useState<ViolationKind>(null);
  const [daysInput, setDaysInput] = useState("");
  const [followInput, setFollowInput] = useState("");
  const [daysActive, setDaysActive] = useState(false);
  const [followActive, setFollowActive] = useState(false);

  const [visitExtra, setVisitExtra] = useState<"none" | "scheduled" | "visited">(
    "none"
  );

  const [sortDays, setSortDays] = useState<SortTriState>(null);
  const [sortPrice, setSortPrice] = useState<SortTriState>(null);
  const [sortCall, setSortCall] = useState<SortTriState>(null);

  const [workOpen, setWorkOpen] = useState(false);
  const [auditFrom, setAuditFrom] = useState(todayInputDate());
  const [auditTo, setAuditTo] = useState(todayInputDate());
  const [auditRows, setAuditRows] = useState<
    {
      id: string;
      clientName: string;
      phone: string;
      action: string;
      summary: string;
      meta: unknown;
      createdAt: string;
    }[]
  >([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [gateDialogOpen, setGateDialogOpen] = useState(false);
  const [gateClientId, setGateClientId] = useState<string | null>(null);

  const [panel, setPanel] = useState<
    | null
    | {
        clientId: string;
        view: "menu" | "close" | "notb" | "won";
      }
  >(null);

  const storageKey = `crm-b-palette-legends-${currentUserId || "anon"}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setLegends(JSON.parse(raw) as Record<string, string>);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(legends));
    } catch {
      /* ignore */
    }
  }, [legends, storageKey]);

  useEffect(() => {
    setStyleMap((prev) => {
      if (serializeRowStyleMap(prev) === serializeRowStyleMap(rowStylesProp)) {
        return prev;
      }
      return { ...rowStylesProp };
    });
  }, [rowStylesProp]);

  const merged = useMemo(() => {
    return rows.map((r) => ({ ...r, ...(local[r.id] ?? {}) }));
  }, [rows, local]);

  const mergedMap = useMemo(() => {
    const m = new Map<string, ReportBRow>();
    for (const r of merged) m.set(r.id, r);
    return m;
  }, [merged]);

  useEffect(() => {
    if (!gateClientId) return;
    const r = mergedMap.get(gateClientId);
    if (r && nextFollowUpMeetsGate(r.nextFollowUpAt)) {
      setGateClientId(null);
    }
  }, [gateClientId, mergedMap]);

  const gateInvalid = useMemo(() => {
    if (!gateClientId) return false;
    const r = mergedMap.get(gateClientId);
    if (!r) return false;
    return !nextFollowUpMeetsGate(r.nextFollowUpAt);
  }, [gateClientId, mergedMap]);

  useEffect(() => {
    if (!gateClientId || !gateInvalid) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [gateClientId, gateInvalid]);

  useEffect(() => {
    if (!gateInvalid || !gateClientId) return;
    const block = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest("[data-gate-exempt]")) return;
      if (el.closest(`[data-gate-row="${gateClientId}"]`)) return;
      if (el.closest('[role="dialog"]')) return;
      if (el.closest('[data-slot="select-content"]')) return;
      e.preventDefault();
      e.stopPropagation();
      setGateDialogOpen(true);
    };
    document.addEventListener("click", block, true);
    return () => document.removeEventListener("click", block, true);
  }, [gateInvalid, gateClientId]);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const debouncedPatch = useCallback(
    (id: string, patch: ReportClientPatchInput) => {
      const tKey = id;
      if (timers.current[tKey]) clearTimeout(timers.current[tKey]);
      timers.current[tKey] = setTimeout(async () => {
        const res = await patchClientReportFields(id, patch);
        if (res.ok) {
          router.refresh();
          setLocal((p) => {
            const n = { ...p };
            delete n[id];
            return n;
          });
        } else toast.error(res.message);
      }, 500);
    },
    [router]
  );

  function patchFromRow(row: ReportBRow): ReportClientPatchInput {
    const slots = normalizeSlots(row.followUpSlots);

    const out: ReportClientPatchInput = {
      name: row.name,
      phone: row.phone,
      phone2: row.phone2,
      company: row.company,
      position: row.position,
      address: row.address,
      activity: row.activity,
      quotePrice: row.quotePrice,
      quoteDetail: row.quoteDetail,
      callSummary: row.callSummary,
      currentSituation: row.currentSituation,
      salesNotes: row.salesNotes,
      finalStatusNote: row.finalStatusNote,
      clientWarmingText: row.clientWarmingText,
      presentingEmployeeName: row.presentingEmployeeName,
      sourceAdName: row.sourceAdName,
      adPlatform: row.adPlatform,
      managementRecommendationText: row.managementRecommendationText,
      nextFollowUpAt: row.nextFollowUpAt ?? "",
      visitAppointmentScheduled: row.visitAppointmentScheduled,
      visitAppointmentDate: row.visitAppointmentDate,
      qqAnswer: row.qqAnswer,
      followUpSlots: slotsToJson(slots),
      classificationId: row.classificationId,
    };

    if (row.managementRecommendationDate) {
      out.managementRecommendationDate = row.managementRecommendationDate;
    }

    return out;
  }

  const onField = useCallback(
    (id: string, base: ReportBRow, patch: Partial<ReportBRow>) => {
      setLocal((prev) => {
        const nextLayer = { ...(prev[id] ?? {}), ...patch };
        const mergedRow = { ...base, ...nextLayer };
        debouncedPatch(id, patchFromRow(mergedRow));
        return { ...prev, [id]: nextLayer };
      });
    },
    [debouncedPatch]
  );

  const filteredByViolation = useMemo(() => {
    return merged.filter((r) => {
      if (violation === "visit_overdue") return passesVisitOverdue(r);
      if (violation === "days_over") {
        const n = Number(daysInput);
        if (!Number.isFinite(n)) return false;
        return passesDaysOver(r, n);
      }
      if (violation === "follow_count") {
        const n = Number(followInput);
        if (!Number.isFinite(n)) return false;
        return passesFollowCount(r, n);
      }
      if (violation === "neglected") return passesNeglected(r);
      if (violation === "no_answer") return passesNoAnswerFilter(r.followUpSlots);
      return true;
    });
  }, [merged, violation, daysInput, followInput]);

  const filteredVisit = useMemo(() => {
    if (visitExtra === "scheduled")
      return filteredByViolation.filter((r) => passesVisitScheduledOnly(r));
    if (visitExtra === "visited")
      return filteredByViolation.filter((r) => passesActuallyVisited(r));
    return filteredByViolation;
  }, [filteredByViolation, visitExtra]);

  const searched = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return filteredVisit;
    return filteredVisit.filter((r) => matchesSearch(r, q));
  }, [filteredVisit, searchQ]);

  const visibleRows = useMemo(() => {
    if (toolbar === "closed") {
      return merged.filter((r) => !hiddenIds.has(r.id));
    }
    const base = searched.filter((r) => !hiddenIds.has(r.id));
    let out = base;
    const tri: [typeof sortDays, "days" | "quotePrice" | "initialCallDate"][] = [
      [sortDays, "days"],
      [sortPrice, "quotePrice"],
      [sortCall, "initialCallDate"],
    ];
    for (const [st, key] of tri) {
      if (st) {
        out = sortRows(out, key, st);
        break;
      }
    }
    return out;
  }, [
    toolbar,
    merged,
    searched,
    hiddenIds,
    sortDays,
    sortPrice,
    sortCall,
  ]);

  const maxFollowCols = useMemo(() => {
    let m = 7;
    for (const r of merged) {
      const n = normalizeSlots(r.followUpSlots).length;
      if (n > m) m = n;
    }
    /* حد أعلى ناعم فقط لأداء العرض — زر + يضيف أعمدة دون سقف ٧ حرفي */
    return Math.min(Math.max(m, 1), 200);
  }, [merged]);

  function cycleSort(
    cur: SortTriState,
    setMe: (v: SortTriState) => void,
    clearOthers: () => void
  ) {
    clearOthers();
    if (cur === null) setMe("asc");
    else if (cur === "asc") setMe("desc");
    else setMe(null);
  }

  async function applyPaletteToRow(clientId: string) {
    if (!selectedColor) {
      toast.error("اختر لوناً من لوحة الألوان أولاً.");
      return;
    }
    const label = legends[selectedColor] ?? "";
    try {
      const res = await fetch(`/api/clients/${clientId}/row-style`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          color: selectedColor,
          reportType: rowStyleReportType,
          label,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        toast.error(data.message ?? "فشل الحفظ");
        return;
      }
      setStyleMap((prev) => ({
        ...prev,
        [clientId]: { color: selectedColor, legendNote: label },
      }));
      toast.success("تم حفظ التلوين");
    } catch {
      toast.error("فشل الاتصال بالخادم.");
    }
  }

  async function clearRowStyle(clientId: string) {
    try {
      const res = await fetch(
        `/api/clients/${clientId}/row-style?reportType=${rowStyleReportType}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        toast.error(data.message ?? "فشل الإزالة");
        return;
      }
      setStyleMap((prev) => {
        const n = { ...prev };
        delete n[clientId];
        return n;
      });
      toast.success("تمت إزالة اللون");
    } catch {
      toast.error("فشل الاتصال بالخادم.");
    }
  }

  async function loadAudit() {
    if (!currentUserId) {
      toast.error("تعذر تحديد المستخدم.");
      return;
    }
    setAuditLoading(true);
    try {
      const p = new URLSearchParams({
        from: `${auditFrom}T00:00:00`,
        to: `${auditTo}T23:59:59`,
        userId: currentUserId,
      });
      const res = await fetch(`/api/audit-log?${p.toString()}`);
      const data = (await res.json()) as {
        rows?: typeof auditRows;
        message?: string;
      };
      if (!res.ok) {
        toast.error(data.message ?? "فشل الجلب");
        setAuditRows([]);
      } else {
        setAuditRows(data.rows ?? []);
      }
    } catch {
      toast.error("فشل الجلب");
      setAuditRows([]);
    } finally {
      setAuditLoading(false);
    }
  }

  function violationMessage(): string | null {
    if (violation === "visit_overdue")
      return "يعرض العملاء التي تجاوز ميعاد زيارتهم ولم يُسجَّل موظف عارض";
    if (violation === "days_over") {
      const n = Number(daysInput);
      return Number.isFinite(n)
        ? `يعرض العملاء الذين تجاوزت أيامهم ${n} يوماً`
        : null;
    }
    if (violation === "follow_count") {
      const n = Number(followInput);
      return Number.isFinite(n)
        ? `يعرض العملاء الذين تجاوزت متابعاتهم ${n}`
        : null;
    }
    if (violation === "neglected")
      return "يعرض العملاء التي انتهى موعد متابعتهم ولم تُسجَّل متابعة جديدة بعد ذلك في الجدول";
    if (violation === "no_answer")
      return "يعرض العملاء المسجَّل في متابعاتهم عدم الرد";
    return null;
  }

  function visitBanner(): string | null {
    if (visitExtra === "scheduled")
      return "يتم عرض التقرير على العملاء المحدد لهم تاريخ زيارة فقط";
    if (visitExtra === "visited")
      return "يتم عرض العملاء التي تمت زيارتهم فعلياً (موظف عرض + تاريخ زيارة)";
    return null;
  }

  function sortBtnClass(st: SortTriState): string {
    if (st === null) return "bg-muted text-foreground hover:bg-muted/80";
    if (st === "asc") return "bg-emerald-600 text-white hover:bg-emerald-700";
    return "bg-blue-600 text-white hover:bg-blue-700";
  }

  function violBtn(active: boolean): string {
    return active
      ? "bg-red-900 text-white hover:bg-red-950"
      : "bg-red-600 text-white hover:bg-red-700";
  }

  const notBClassifications = classifications.filter((c) => !c.isBRow);

  return (
    <div className="flex flex-col gap-4">
      {toolbar !== "closed" ? (
        <>
      <div data-gate-exempt className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="bg-black text-white hover:bg-black/90"
          onClick={() => {
            setWorkOpen(true);
            setAuditFrom(todayInputDate());
            setAuditTo(todayInputDate());
          }}
        >
          سجل العمل
        </Button>
        <Input
          placeholder="بحث باسم الشركة أو الهاتف أو اسم العميل"
          className="h-9 max-w-md"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          dir="rtl"
        />
      </div>

      <div data-gate-exempt className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className={sortBtnClass(sortDays)}
          onClick={() =>
            cycleSort(sortDays, setSortDays, () => {
              setSortPrice(null);
              setSortCall(null);
            })
          }
        >
          ترتيب بعدد الأيام
        </Button>
        <Button
          type="button"
          size="sm"
          className={sortBtnClass(sortPrice)}
          onClick={() =>
            cycleSort(sortPrice, setSortPrice, () => {
              setSortDays(null);
              setSortCall(null);
            })
          }
        >
          ترتيب بعرض السعر
        </Button>
        <Button
          type="button"
          size="sm"
          className={sortBtnClass(sortCall)}
          onClick={() =>
            cycleSort(sortCall, setSortCall, () => {
              setSortDays(null);
              setSortPrice(null);
            })
          }
        >
          ترتيب بتاريخ الاتصال
        </Button>
      </div>

      <div data-gate-exempt className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={visitExtra === "scheduled" ? "default" : "outline"}
          onClick={() =>
            setVisitExtra((v) =>
              v === "scheduled" ? "none" : "scheduled"
            )
          }
        >
          عرض المحدد تاريخ زيارة لهم فقط
        </Button>
        <Button
          type="button"
          size="sm"
          variant={visitExtra === "visited" ? "default" : "outline"}
          onClick={() =>
            setVisitExtra((v) => (v === "visited" ? "none" : "visited"))
          }
        >
          العملاء التي تمت زيارتهم فعلياً
        </Button>
      </div>

      <div data-gate-exempt className="rounded-lg border-2 border-destructive p-3">
        <p className="mb-2 text-sm font-semibold text-destructive">
          ⚠ تجاوزات التقرير
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className={violBtn(violation === "visit_overdue")}
            onClick={() =>
              setViolation((v) =>
                v === "visit_overdue" ? null : "visit_overdue"
              )
            }
          >
            تجاوز ميعاد الزيارة
          </Button>
          <Button
            type="button"
            size="sm"
            className={violBtn(violation === "days_over")}
            onClick={() => {
              setViolation((x) => (x === "days_over" ? null : "days_over"));
              setDaysActive(true);
            }}
          >
            تجاوز عدد أيام
          </Button>
          <Input
            type="number"
            min={0}
            className="h-8 w-20 text-center"
            disabled={!daysActive}
            value={daysInput}
            onChange={(e) => setDaysInput(e.target.value)}
            dir="ltr"
          />
          <Button
            type="button"
            size="sm"
            className={violBtn(violation === "follow_count")}
            onClick={() => {
              setViolation((x) =>
                x === "follow_count" ? null : "follow_count"
              );
              setFollowActive(true);
            }}
          >
            تجاوز عدد متابعات
          </Button>
          <Input
            type="number"
            min={0}
            className="h-8 w-20 text-center"
            disabled={!followActive}
            value={followInput}
            onChange={(e) => setFollowInput(e.target.value)}
            dir="ltr"
          />
          <Button
            type="button"
            size="sm"
            className={violBtn(violation === "neglected")}
            onClick={() =>
              setViolation((v) =>
                v === "neglected" ? null : "neglected"
              )
            }
          >
            عملاء مهملين
          </Button>
          <Button
            type="button"
            size="sm"
            className={violBtn(violation === "no_answer")}
            onClick={() =>
              setViolation((v) =>
                v === "no_answer" ? null : "no_answer"
              )
            }
          >
            عملاء لا ترد
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setViolation(null);
              setDaysInput("");
              setFollowInput("");
              setDaysActive(false);
              setFollowActive(false);
            }}
          >
            إلغاء كل الفلاتر
          </Button>
        </div>
      </div>

      {(violationMessage() || visitBanner()) && (
        <div className="space-y-1 text-sm text-destructive">
          {violationMessage() ? <p>{violationMessage()}</p> : null}
          {visitBanner() ? <p>{visitBanner()}</p> : null}
        </div>
      )}

      <SimpleDialog
        open={workOpen}
        onOpenChange={setWorkOpen}
        title="سجل العمل"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setWorkOpen(false)}>
              إغلاق
            </Button>
            <Button type="button" onClick={() => void loadAudit()} disabled={auditLoading}>
              {auditLoading ? "جاري…" : "موافق"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs">
            من تاريخ
            <Input
              type="date"
              dir="ltr"
              value={auditFrom}
              onChange={(e) => setAuditFrom(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs">
            إلى تاريخ
            <Input
              type="date"
              dir="ltr"
              value={auditTo}
              onChange={(e) => setAuditTo(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 max-h-[50vh] overflow-auto rounded border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="border-s border-border/80 p-2 text-right first:border-s-0">
                  العميل
                </th>
                <th
                  className="border-s border-border/80 p-2 text-left first:border-s-0"
                  dir="ltr"
                >
                  الهاتف
                </th>
                <th className="border-s border-border/80 p-2 text-right first:border-s-0">
                  الإجراء
                </th>
                <th
                  className="border-s border-border/80 p-2 text-left first:border-s-0"
                  dir="ltr"
                >
                  التوقيت
                </th>
              </tr>
            </thead>
            <tbody>
              {auditRows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="border-s border-border/80 p-2 first:border-s-0">
                    {row.clientName}
                  </td>
                  <td className="border-s border-border/80 p-2 first:border-s-0" dir="ltr">
                    {row.phone}
                  </td>
                  <td className="max-w-[240px] border-s border-border/80 p-2 whitespace-pre-wrap first:border-s-0">
                    <span className="font-mono text-[10px]">{row.action}</span>
                    {" — "}
                    {row.summary}
                    {row.meta != null ? (
                      <span className="block text-[10px] text-muted-foreground">
                        {typeof row.meta === "object"
                          ? JSON.stringify(row.meta)
                          : String(row.meta)}
                      </span>
                    ) : null}
                  </td>
                  <td
                    className="border-s border-border/80 p-2 text-[10px] first:border-s-0"
                    dir="ltr"
                  >
                    {formatDateTimeArabic(new Date(row.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditRows.length === 0 && !auditLoading ? (
            <p className="p-4 text-center text-muted-foreground">
              لا توجد سجلات — اضغط موافق بعد اختيار الفترة.
            </p>
          ) : null}
        </div>
      </SimpleDialog>
        </>
      ) : null}

      <SimpleDialog
        open={gateDialogOpen}
        onOpenChange={setGateDialogOpen}
        title="متابعة مطلوبة"
      >
        <p className="text-sm leading-relaxed">
          لن يُحفَظ البيانات الجديدة ولا يُسمح بأي تعديل حتى تُدخِل تاريخ متابعة
          تالٍ جديداً لهذا العميل، أو تضغط «إلغاء» للرجوع عن تسجيل المتابعة.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setGateDialogOpen(false);
              if (gateClientId) {
                setLocal((p) => {
                  const n = { ...p };
                  delete n[gateClientId];
                  return n;
                });
                setGateClientId(null);
                router.refresh();
              }
            }}
          >
            إلغاء
          </Button>
          <Button type="button" onClick={() => setGateDialogOpen(false)}>
            متابعة التحرير
          </Button>
        </div>
      </SimpleDialog>

      <div dir="rtl" className="flex flex-row-reverse items-start gap-3">
        <aside
          data-gate-exempt
          className="sticky top-16 flex w-44 shrink-0 flex-col gap-3 rounded-lg border border-border p-2"
        >
          <p className="text-center text-[11px] font-medium text-muted-foreground">
            تلوين الصفوف
          </p>
          {REPORT_B_PALETTE.map(({ hex }) => (
            <div key={hex} className="flex flex-col gap-1">
              <button
                type="button"
                title={hex}
                className={`h-10 w-full rounded-md border-2 shadow-sm transition ${
                  selectedColor === hex
                    ? "border-primary ring-2 ring-primary"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: hex }}
                onClick={() =>
                  setSelectedColor((prev) => (prev === hex ? null : hex))
                }
              />
              <Input
                className="h-7 text-[10px]"
                placeholder="وصف اللون"
                value={legends[hex] ?? ""}
                onChange={(e) =>
                  setLegends((prev) => ({ ...prev, [hex]: e.target.value }))
                }
                dir="rtl"
              />
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">
            اختر لوناً ثم انقر على صف لتلوينه. انقر مرة أخرى على نفس اللون
            لإلغاء اختياره.
          </p>
        </aside>

        <div
          ref={reportBScrollRef}
          data-report-b-scroll
          className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border/60 shadow-sm"
        >
          <Table
            className={cn(
              "min-w-[3200px] text-sm [&_td]:whitespace-normal [&_td]:align-top",
              "[&_th]:!border-s [&_th]:!border-border/50 [&_td]:!border-s [&_td]:!border-border/50",
              "[&_tr]:!border-b [&_tr]:!border-border/40",
              "dark:[&_th]:!border-border/35 dark:[&_td]:!border-border/35 dark:[&_tr]:!border-border/30"
            )}
          >
            <TableHeader>
              <TableRow className="bg-muted/60">
                {toolbar === "closed" ? (
                  <>
                    <TableHead className="min-w-[110px]">تاريخ الإغلاق</TableHead>
                    <TableHead className="min-w-[72px]">الحالة</TableHead>
                    <TableHead className="min-w-[140px]">سبب الإغلاق</TableHead>
                  </>
                ) : null}
                <TableHead className="sticky right-0 z-10 min-w-[120px] bg-muted/95">
                  إجراءات
                </TableHead>
                <TableHead className="min-w-[170px]">متابعة تالية</TableHead>
                <TableHead className="min-w-[140px]">توصيات الإدارة</TableHead>
                <TableHead className="min-w-[120px]">تاريخ التوصية</TableHead>
                <TableHead className="min-w-[90px]">سيلز</TableHead>
                <TableHead className="min-w-[10rem]">شركة</TableHead>
                <TableHead className="w-12">أيام</TableHead>
                <TableHead className="min-w-[100px]">اتصال</TableHead>
                <TableHead className="min-w-[9rem]">اسم المسئول</TableHead>
                <TableHead className="min-w-[9rem]">نشاط</TableHead>
                <TableHead className="min-w-[9rem]">وظيفة</TableHead>
                <TableHead className="min-w-[120px]">عنوان</TableHead>
                <TableHead className="min-w-[110px]">هاتف</TableHead>
                <TableHead className="min-w-[72px]">عرض سعر</TableHead>
                <TableHead className="min-w-[120px]">تفصيل السعر</TableHead>
                <TableHead className="min-w-[140px]">ملخص وموقف</TableHead>
                <TableHead className="min-w-[120px]">ملاحظات سيلز</TableHead>
                <TableHead className="min-w-[8rem]">تصنيف</TableHead>
                <TableHead className="min-w-[8rem]">منصة</TableHead>
                <TableHead className="min-w-[9rem]">إعلان</TableHead>
                <TableHead className="w-14">زيارة؟</TableHead>
                <TableHead className="min-w-[110px]">تاريخ زيارة</TableHead>
                <TableHead className="min-w-[9rem]">موظف عرض</TableHead>
                <TableHead className="w-14">QQ</TableHead>
                <TableHead className="min-w-[120px]">موقف نهائي</TableHead>
                {Array.from({ length: maxFollowCols }, (_, i) => (
                  <Fragment key={`fh-${i}`}>
                    <TableHead className="min-w-[11rem]">متابعة {i + 1}</TableHead>
                    <TableHead className="min-w-[9rem]">تاريخ {i + 1}</TableHead>
                  </Fragment>
                ))}
                <TableHead className="w-10">+</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((r) => {
                const days = daysElapsedSinceContact(
                  r.initialCallDate ? new Date(r.initialCallDate) : null
                );
                const slots = normalizeSlots(r.followUpSlots);
                const mgmtDateStr = r.managementRecommendationDate
                  ? isoToDateInput(r.managementRecommendationDate)
                  : todayInputDate();
                const combinedNote = mergedCallAndSituation(
                  r.callSummary,
                  r.currentSituation
                );
                const rowBg = styleMap[r.id]?.color;
                const bgStyle = rowBg
                  ? { backgroundColor: hexToRgba(rowBg, 0.22) }
                  : undefined;

                return (
                  <TableRow
                    key={r.id}
                    data-gate-row={gateClientId === r.id ? r.id : undefined}
                    className="cursor-pointer align-top"
                    style={bgStyle}
                    onClick={(e) => {
                      if (gateInvalid && gateClientId === r.id) {
                        e.preventDefault();
                        setGateDialogOpen(true);
                        return;
                      }
                      const t = e.target as HTMLElement;
                      if (
                        t.closest(
                          "input,textarea,button,a,select,[role=combobox]"
                        )
                      )
                        return;
                      if (selectedColor) void applyPaletteToRow(r.id);
                    }}
                  >
                    {toolbar === "closed" ? (
                      <>
                        <TableCell dir="ltr" className="text-[10px] whitespace-nowrap">
                          {r.closedLostAt
                            ? formatDateArabicLong(new Date(r.closedLostAt))
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">مغلق</Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px] whitespace-pre-wrap text-[10px]">
                          {(r.lossReason ?? "").trim() || "—"}
                        </TableCell>
                      </>
                    ) : null}
                    <TableCell className="sticky right-0 z-10 border-s border-border/55 bg-background dark:border-border/40">
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/clients/${r.id}`}
                          className="text-[10px] text-primary underline"
                          onClick={(e) => {
                            if (gateInvalid && gateClientId === r.id) {
                              e.preventDefault();
                              setGateDialogOpen(true);
                            }
                          }}
                        >
                          بطاقة
                        </Link>
                        {toolbar === "closed" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 w-full px-1 text-[11px] leading-tight"
                            disabled={reopeningClientId === r.id}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setReopeningClientId(r.id);
                              try {
                                const res = await reopenClosedClientFromReport(
                                  r.id
                                );
                                if (res.ok) {
                                  toast.success(
                                    "تمت إعادة فتح العميل واستعادة حالته السابقة"
                                  );
                                  router.push(
                                    res.redirectReport === "b"
                                      ? "/reports/b"
                                      : "/reports/not-b"
                                  );
                                } else {
                                  toast.error(res.message);
                                }
                              } finally {
                                setReopeningClientId(null);
                              }
                            }}
                          >
                            {reopeningClientId === r.id
                              ? "جاري…"
                              : "إعادة العميل"}
                          </Button>
                        ) : null}
                        {styleMap[r.id]?.color ? (
                          <button
                            type="button"
                            className="text-[10px] text-destructive underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              void clearRowStyle(r.id);
                            }}
                          >
                            × إزالة اللون
                          </button>
                        ) : null}
                        {toolbar !== "closed" ? (
                        <StatusPopoverBlock
                          clientId={r.id}
                          classifications={notBClassifications}
                          gateInvalid={
                            gateInvalid && gateClientId === r.id
                          }
                          onBlocked={() => setGateDialogOpen(true)}
                          onDone={(hid) => {
                            if (hid)
                              setHiddenIds((prev) => new Set(prev).add(hid));
                            setPanel(null);
                          }}
                          open={
                            panel?.clientId === r.id ? panel.view : null
                          }
                          setOpen={(v) =>
                            setPanel(v ? { clientId: r.id, view: v } : null)
                          }
                        />
                        ) : null}
                        <div className="mt-1.5 flex items-center justify-center gap-1 border-t border-border/50 pt-1.5 dark:border-border/40">
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="size-7 shrink-0"
                            title="تمرير الجدول لليسار"
                            aria-label="تمرير الجدول لليسار"
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollReportBHorizontal(-1);
                            }}
                          >
                            <ChevronLeft className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="size-7 shrink-0"
                            title="تمرير الجدول لليمين"
                            aria-label="تمرير الجدول لليمين"
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollReportBHorizontal(1);
                            }}
                          >
                            <ChevronRight className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="datetime-local"
                        className={cn(
                          reportBInput,
                          "min-w-[11rem] text-left tabular-nums"
                        )}
                        dir="ltr"
                        disabled={pending}
                        value={isoToLocal(r.nextFollowUpAt)}
                        onChange={(e) => {
                          const nextFollowUpAt = localToIso(e.target.value);
                          onField(r.id, r, { nextFollowUpAt });
                          if (
                            gateClientId === r.id &&
                            nextFollowUpMeetsGate(nextFollowUpAt)
                          ) {
                            setGateClientId(null);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        className={reportBTextarea}
                        disabled={pending}
                        value={r.managementRecommendationText ?? ""}
                        onChange={(e) =>
                          onField(r.id, r, {
                            managementRecommendationText: e.target.value,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        dir="ltr"
                        className={cn(reportBInput, "text-left")}
                        disabled={pending}
                        value={mgmtDateStr}
                        onChange={(e) =>
                          onField(r.id, r, {
                            managementRecommendationDate: dateInputToIso(
                              e.target.value
                            ),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.assignedUserName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        className={reportBTextarea}
                        disabled={pending}
                        value={r.company ?? ""}
                        onChange={(e) =>
                          onField(r.id, r, { company: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell dir="ltr" className="text-muted-foreground">
                      {days === null ? "—" : `${days} D`}
                    </TableCell>
                    <TableCell dir="ltr" className="text-muted-foreground">
                      {r.initialCallDate
                        ? formatDateArabicLong(new Date(r.initialCallDate))
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        className={reportBTextarea}
                        disabled={pending}
                        value={r.name}
                        onChange={(e) =>
                          onField(r.id, r, { name: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        className={reportBTextarea}
                        disabled={pending}
                        value={r.activity ?? ""}
                        onChange={(e) =>
                          onField(r.id, r, { activity: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        className={reportBTextarea}
                        disabled={pending}
                        value={r.position ?? ""}
                        onChange={(e) =>
                          onField(r.id, r, { position: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        className={cn(reportBTextarea, "min-w-[12rem]")}
                        value={r.address ?? ""}
                        disabled={pending}
                        onChange={(e) =>
                          onField(r.id, r, { address: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell dir="ltr">
                      <Textarea
                        rows={2}
                        className={cn(reportBTextarea, "min-w-[11rem] text-left")}
                        value={[r.phone, r.phone2].filter(Boolean).join(" / ")}
                        disabled={pending}
                        onChange={(e) => {
                          const parts = e.target.value.split(/\s*\/\s*/);
                          onField(r.id, r, {
                            phone: parts[0]?.trim() ?? "",
                            phone2: parts[1]?.trim() || null,
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell dir="ltr">
                      <Textarea
                        rows={2}
                        className={cn(
                          reportBTextarea,
                          "min-w-[6rem] text-left tabular-nums"
                        )}
                        value={r.quotePrice ?? ""}
                        disabled={pending}
                        onChange={(e) =>
                          onField(r.id, r, { quotePrice: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        title={r.quoteDetail ?? ""}
                        className={reportBTextarea}
                        disabled={pending}
                        value={r.quoteDetail ?? ""}
                        onChange={(e) =>
                          onField(r.id, r, { quoteDetail: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        title={combinedNote}
                        className={reportBTextarea}
                        disabled={pending}
                        value={combinedNote}
                        onChange={(e) => {
                          const sp = splitCallAndSituation(e.target.value);
                          onField(r.id, r, {
                            callSummary: sp.callSummary,
                            currentSituation: sp.currentSituation,
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        title={r.salesNotes ?? ""}
                        className={reportBTextarea}
                        disabled={pending}
                        value={r.salesNotes ?? ""}
                        onChange={(e) =>
                          onField(r.id, r, { salesNotes: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.classificationId ?? "__none__"}
                        onValueChange={(v) => {
                          const id = v === "__none__" ? null : v;
                          const opt = classifications.find((c) => c.id === v);
                          onField(r.id, r, {
                            classificationId: id,
                            classificationLabel: opt?.label ?? null,
                            classificationColor: opt?.color ?? null,
                          });
                        }}
                      >
                        <SelectTrigger className={reportBSelectTrigger}>
                          <SelectValue placeholder="—">
                            {r.classificationId
                              ? (r.classificationLabel ??
                                  classifications.find(
                                    (c) => c.id === r.classificationId
                                  )?.label ??
                                  undefined)
                              : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {(() => {
                            const base = tableClassificationOptions;
                            const extra =
                              r.classificationId &&
                              !base.some((c) => c.id === r.classificationId)
                                ? classifications.find(
                                    (c) => c.id === r.classificationId
                                  )
                                : null;
                            const opts = extra ? [...base, extra] : base;
                            return opts.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className="inline-block size-2.5 rounded-sm border"
                                    style={{ backgroundColor: c.color }}
                                  />
                                  {c.label}
                                </span>
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        className={reportBTextarea}
                        disabled={pending}
                        value={r.adPlatform ?? ""}
                        onChange={(e) =>
                          onField(r.id, r, { adPlatform: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        className={reportBTextarea}
                        disabled={pending}
                        value={r.sourceAdName ?? ""}
                        onChange={(e) =>
                          onField(r.id, r, { sourceAdName: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={r.visitAppointmentScheduled}
                        disabled={pending}
                        onChange={(e) =>
                          onField(r.id, r, {
                            visitAppointmentScheduled: e.target.checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        dir="ltr"
                        className={cn(reportBInput, "text-left")}
                        disabled={pending}
                        value={isoToDateInput(r.visitAppointmentDate)}
                        onChange={(e) =>
                          onField(r.id, r, {
                            visitAppointmentDate: dateInputToIso(
                              e.target.value
                            ),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        className={reportBTextarea}
                        disabled={pending}
                        value={r.presentingEmployeeName ?? ""}
                        onChange={(e) =>
                          onField(r.id, r, {
                            presentingEmployeeName: e.target.value,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={
                          r.qqAnswer === null
                            ? "__none__"
                            : r.qqAnswer
                              ? "yes"
                              : "no"
                        }
                        onValueChange={(v) =>
                          onField(r.id, r, {
                            qqAnswer:
                              v === "__none__"
                                ? null
                                : v === "yes"
                                  ? true
                                  : false,
                          })
                        }
                      >
                        <SelectTrigger className={reportBSelectTrigger}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          <SelectItem value="yes">نعم</SelectItem>
                          <SelectItem value="no">لا</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Textarea
                        rows={2}
                        title={r.finalStatusNote ?? ""}
                        className={reportBTextarea}
                        disabled={pending}
                        value={r.finalStatusNote ?? ""}
                        onChange={(e) =>
                          onField(r.id, r, {
                            finalStatusNote: e.target.value,
                          })
                        }
                      />
                    </TableCell>
                    {Array.from({ length: maxFollowCols }, (_, i) => {
                      const slot = slots[i];
                      return (
                        <Fragment key={`${r.id}-slot-${i}`}>
                          <TableCell>
                            <Textarea
                              rows={2}
                              title={slot?.note ?? ""}
                              className={reportBTextarea}
                              disabled={pending}
                              value={slot?.note ?? ""}
                              onChange={(e) => {
                                const next = [...slots];
                                while (next.length <= i)
                                  next.push({
                                    order: next.length + 1,
                                    note: "",
                                    date: "",
                                  });
                                next[i] = {
                                  ...next[i],
                                  order: i + 1,
                                  note: e.target.value,
                                };
                                onField(r.id, r, {
                                  followUpSlots: slotsToJson(next),
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              dir="ltr"
                              className={cn(reportBInput, "text-left")}
                              disabled={pending}
                              value={
                                slot?.date
                                  ? isoToDateInput(slot.date)
                                  : ""
                              }
                              onChange={(e) => {
                                const next = [...slots];
                                while (next.length <= i)
                                  next.push({
                                    order: next.length + 1,
                                    note: "",
                                    date: "",
                                  });
                                next[i] = {
                                  ...next[i],
                                  order: i + 1,
                                  date:
                                    dateInputToIso(e.target.value) ?? "",
                                };
                                onField(r.id, r, {
                                  followUpSlots: slotsToJson(next),
                                });
                              }}
                            />
                          </TableCell>
                        </Fragment>
                      );
                    })}
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        disabled={pending}
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = [...slots];
                          next.push({
                            order: next.length + 1,
                            note: "",
                            date: new Date().toISOString(),
                          });
                          onField(r.id, r, {
                            followUpSlots: slotsToJson(next),
                          });
                        }}
                      >
                        +
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {visibleRows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              لا توجد بيانات ضمن الفلاتر الحالية.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusPopoverBlock({
  clientId,
  classifications,
  open,
  setOpen,
  onDone,
  gateInvalid,
  onBlocked,
}: {
  clientId: string;
  classifications: ClassificationRow[];
  open: "menu" | "close" | "notb" | "won" | null;
  setOpen: (v: "menu" | "close" | "notb" | "won" | null) => void;
  onDone: (hideId?: string) => void;
  gateInvalid: boolean;
  onBlocked: () => void;
}) {
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

  const clsLabel = useMemo(() => {
    if (!clsId) return null;
    return classifications.find((c) => c.id === clsId)?.label ?? null;
  }, [clsId, classifications]);

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
                    const res = await closeClientFromReport(clientId, reason);
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
              onValueChange={(v) =>
                setClsId(!v || v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger
                className={cn(reportBSelectTrigger, "h-9 w-full")}
                dir="rtl"
              >
                <SelectValue placeholder="التصنيف">
                  {clsLabel ?? undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {classifications.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block size-3 shrink-0 rounded-sm border border-border"
                        style={{ backgroundColor: c.color }}
                        aria-hidden
                      />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
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
                      clsId
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
            <Input
              type="date"
              dir="ltr"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
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
                      new Date(saleDate + "T12:00:00").toISOString()
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
        variant="outline"
        className="h-7 w-full px-1"
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

function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateInputToIso(date: string): string | null {
  if (!date) return null;
  const d = new Date(date + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
