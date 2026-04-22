"use client";

import { ClientStatus, type UserRole } from "@prisma/client";
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
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowLeftToLine,
  ArrowRightToLine,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { ReportWorkLogDialog } from "@/components/reports/report-work-log-dialog";
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
import type { ClassificationRow } from "@/lib/data/classifications";
import { formatDateArabicLong, todayInputDate } from "@/lib/date-arabic";
import { sanitizeDisplayLabel } from "@/lib/display-text";
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
  /** لمسار التصنيف/الانتقالات (مثلاً not-b) */
  rowStyleReportType?: "b" | "not-b" | "closed";
  /** full: أدوات التقرير كاملة | closed: تقرير المغلقة | dashboard: جدول فقط + بحث (لوحة) */
  toolbar?: "full" | "closed" | "dashboard";
  /** مفتاح تقرير سجل العمل (تصفية AuditLog) — مثل report-dashboard-followups */
  auditReportKey?: string;
  workLogUserId?: string;
  workLogUserRole?: UserRole;
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

/** يزيل المتابعات الفارغة من نهاية السجل قبل الحفظ في القاعدة */
function trimTrailingEmptyFollowSlots(slots: FollowSlot[]): FollowSlot[] {
  if (slots.length === 0) return [];
  let end = slots.length;
  while (
    end > 0 &&
    !(slots[end - 1]?.note ?? "").trim() &&
    !(slots[end - 1]?.date ?? "").trim()
  ) {
    end--;
  }
  return slots.slice(0, end).map((s, i) => ({
    ...s,
    order: i + 1,
  }));
}

function mergedCallAndSituation(call: string | null, sit: string | null): string {
  const a = (call ?? "").trim();
  const b = (sit ?? "").trim();
  if (!a && !b) return "";
  if (!a) return b;
  if (!b) return a;
  return `${a}\n---\n${b}`;
}

/** عند التمرير على الحقل يظهر نص التلميح بالمحتوى الكامل */
function fullCellTooltip(value: string | null | undefined): string {
  const s = value ?? "";
  return s.trim() ? s : "— فارغ —";
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

function nextFollowUpMeetsGate(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d >= startOfToday();
}

export function ReportBTable({
  rows,
  classifications,
  rowStyleReportType = "b",
  toolbar = "full",
  auditReportKey,
  workLogUserId,
  workLogUserRole = "SALES",
}: Props) {
  const router = useRouter();
  const [local, setLocal] = useState<Record<string, Partial<ReportBRow>>>({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const reportBScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollReportBHorizontal = useCallback((direction: -1 | 1) => {
    const root = reportBScrollRef.current;
    if (!root) return;
    const el =
      root.querySelector<HTMLElement>('[data-slot="table-container"]') ?? root;
    if (el.scrollWidth <= el.clientWidth + 1) return;
    const step = Math.max(280, Math.round(el.clientWidth * 0.42));
    const rtl = getComputedStyle(el).direction === "rtl";
    const leftDelta = (rtl ? -1 : 1) * direction * step;
    el.scrollBy({ left: leftDelta, behavior: "smooth" });
  }, []);

  /** نفس أطراف المسار في الوضعين LTR/RTL: يسار الشاشة = min / يمين = max مع عكس عند rtl. */
  const scrollReportBHorizontalToEdge = useCallback(
    (edge: "start" | "end") => {
      const root = reportBScrollRef.current;
      if (!root) return;
      const el =
        root.querySelector<HTMLElement>('[data-slot="table-container"]') ??
        root;
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      const rtl = getComputedStyle(el).direction === "rtl";
      const left =
        edge === "start" ? (rtl ? max : 0) : (rtl ? 0 : max);
      el.scrollTo({ left, behavior: "smooth" });
    },
    []
  );
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [reopeningClientId, setReopeningClientId] = useState<string | null>(
    null
  );
  /** تقرير Not B: لا يُعرض صف مسار B في قائمة التصنيف لتفادي قوائم فارغة/قيم غير مطابقة */
  const tableClassificationOptions = useMemo(
    () =>
      rowStyleReportType === "not-b"
        ? classifications.filter((c) => !c.isBRow)
        : classifications,
    [rowStyleReportType, classifications]
  );

  const resolvedAuditReportKey = useMemo(() => {
    const k = auditReportKey?.trim();
    if (k) return k;
    if (toolbar === "closed") return "report-closed";
    if (rowStyleReportType === "not-b") return "report-not-b";
    return "report-b";
  }, [auditReportKey, toolbar, rowStyleReportType]);

  const dashboardMode = toolbar === "dashboard";

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
  const [sortFollowUp, setSortFollowUp] = useState<SortTriState>(null);
  /** فلتر «تجاوز ميعاد الزيارة» — نُظهره مع أزرار ترتيب الأعمدة */
  const [visitOverdueOnly, setVisitOverdueOnly] = useState(false);

  /** أعمدة متابعة إضافية للعرض فقط — لا تُكتب في JSON حتى يملأ المستخدم الخانة */
  const [followColExtra, setFollowColExtra] = useState(0);

  const [gateDialogOpen, setGateDialogOpen] = useState(false);
  const [gateClientId, setGateClientId] = useState<string | null>(null);

  const [panel, setPanel] = useState<
    | null
    | {
        clientId: string;
        view: "menu" | "close" | "notb" | "won";
      }
  >(null);

  /** تمييز الصف النشط عند النقر على أي خلية (يُزال بالنقر خارج الجدول أو على صف آخر) */
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      const root = reportBScrollRef.current;
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (!root?.contains(t)) setFocusedRowId(null);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []);

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

  function patchFromRow(row: ReportBRow): ReportClientPatchInput {
    const slots = trimTrailingEmptyFollowSlots(normalizeSlots(row.followUpSlots));

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

    out.managementRecommendationDate =
      row.managementRecommendationDate && row.managementRecommendationDate.trim() !== ""
        ? row.managementRecommendationDate
        : "";

    return out;
  }

  const saveRow = useCallback(
    async (id: string) => {
      const row = mergedMap.get(id);
      if (!row) return;
      setSavingRowId(id);
      try {
        const res = await patchClientReportFields(id, patchFromRow(row), {
          reportKey: resolvedAuditReportKey,
        });
        if (res.ok) {
          toast.success("تم حفظ الصف");
          setLocal((p) => {
            const n = { ...p };
            delete n[id];
            return n;
          });
          router.refresh();
        } else {
          toast.error(res.message);
        }
      } finally {
        setSavingRowId(null);
      }
    },
    [mergedMap, router, resolvedAuditReportKey]
  );

  const onField = useCallback(
    (id: string, _base: ReportBRow, patch: Partial<ReportBRow>) => {
      setLocal((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? {}), ...patch },
      }));
    },
    []
  );

  const filteredByViolation = useMemo(() => {
    const list = merged.filter((r) => {
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
    if (!visitOverdueOnly) return list;
    return list.filter((r) => passesVisitOverdue(r));
  }, [merged, violation, daysInput, followInput, visitOverdueOnly]);

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
    const base = searched.filter((r) => !hiddenIds.has(r.id));
    let out = base;
    const tri: [
      SortTriState,
      "days" | "quotePrice" | "initialCallDate" | "nextFollowUpAt",
    ][] = [
      [sortDays, "days"],
      [sortPrice, "quotePrice"],
      [sortCall, "initialCallDate"],
      [sortFollowUp, "nextFollowUpAt"],
    ];
    for (const [st, key] of tri) {
      if (st) {
        out = sortRows(out, key, st);
        break;
      }
    }
    return out;
  }, [
    merged,
    searched,
    hiddenIds,
    sortDays,
    sortPrice,
    sortCall,
    sortFollowUp,
  ]);

  const maxFollowCols = useMemo(() => {
    let m = 0;
    for (const r of merged) {
      const n = normalizeSlots(r.followUpSlots).length;
      if (n > m) m = n;
    }
    const base = Math.max(m, 1);
    /* عمود واحد على الأقل؛ + في الرأس يزيد followColExtra دون إنشاء slots وهمية */
    return Math.min(base + followColExtra, 999);
  }, [merged, followColExtra]);

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

  function visitOverdueFilterMessage(): string | null {
    if (!visitOverdueOnly) return null;
    return "يعرض العملاء التي تجاوز ميعاد زيارتهم ولم يُسجَّل موظف عارض";
  }

  function violationMessage(): string | null {
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
      return "يعرض التقرير العملاء الذين تجاوز تاريخ المتابعة التالية تاريخ اليوم دون تسجيل متابعة لاحقة في خانات المتابعة بالجدول، أو الذين لا يوجد لهم تاريخ متابعة تالية محدد في ذلك العمود.";
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

  function violChip(active: boolean): string {
    return cn(
      "h-9 shrink-0 rounded-lg px-3 text-sm font-medium transition-all",
      active
        ? "border-destructive bg-destructive text-destructive-foreground shadow-sm ring-2 ring-destructive/25 hover:bg-destructive/90"
        : "border border-destructive/35 bg-background text-destructive hover:border-destructive/55 hover:bg-destructive/10"
    );
  }

  const notBClassifications = classifications.filter((c) => !c.isBRow);

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        dashboardMode && "gap-2"
      )}
    >
      <div
        data-gate-exempt
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm backdrop-blur-sm dark:bg-card/50"
        dir="rtl"
      >
        {workLogUserId ? (
          <ReportWorkLogDialog
            reportKey={resolvedAuditReportKey}
            userId={workLogUserId}
            userRole={workLogUserRole}
          />
        ) : null}
        <Input
          placeholder="بحث باسم الشركة أو الهاتف أو اسم العميل"
          className="h-10 min-w-[12rem] flex-1 max-w-xl rounded-xl border-border/70 bg-background/90 text-sm shadow-inner"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          dir="rtl"
        />
      </div>

      {!dashboardMode ? (
      <div
          data-gate-exempt
          className="rounded-2xl border border-border/60 bg-muted/15 p-4 shadow-sm dark:bg-muted/10"
          dir="rtl"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
                ترتيب الأعمدة
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="lg"
                  className={cn("h-9 rounded-xl px-3 text-sm", sortBtnClass(sortDays))}
                  onClick={() =>
                    cycleSort(sortDays, setSortDays, () => {
                      setSortPrice(null);
                      setSortCall(null);
                      setSortFollowUp(null);
                    })
                  }
                >
                  ترتيب بعدد الأيام
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className={cn("h-9 rounded-xl px-3 text-sm", sortBtnClass(sortPrice))}
                  onClick={() =>
                    cycleSort(sortPrice, setSortPrice, () => {
                      setSortDays(null);
                      setSortCall(null);
                      setSortFollowUp(null);
                    })
                  }
                >
                  ترتيب بعرض السعر
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className={cn("h-9 rounded-xl px-3 text-sm", sortBtnClass(sortCall))}
                  onClick={() =>
                    cycleSort(sortCall, setSortCall, () => {
                      setSortDays(null);
                      setSortPrice(null);
                      setSortFollowUp(null);
                    })
                  }
                >
                  ترتيب بتاريخ الاتصال
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  className={violChip(visitOverdueOnly)}
                  onClick={() => setVisitOverdueOnly((v) => !v)}
                >
                  تجاوز ميعاد الزيارة
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className={cn(
                    "h-9 rounded-xl px-3 text-sm",
                    sortBtnClass(sortFollowUp)
                  )}
                  onClick={() =>
                    cycleSort(sortFollowUp, setSortFollowUp, () => {
                      setSortDays(null);
                      setSortPrice(null);
                      setSortCall(null);
                    })
                  }
                >
                  ترتيب بتاريخ المتابعة التالية
                </Button>
              </div>
            </div>
            <div className="flex w-full min-w-0 shrink-0 flex-col items-center lg:max-w-[min(100%,40rem)]">
              <p className="mb-2 w-full text-center text-xs font-semibold tracking-wide text-muted-foreground">
                فلتر الزيارة
              </p>
              <div className="flex w-full min-w-0 flex-nowrap items-center justify-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                <Button
                  type="button"
                  size="lg"
                  variant={visitExtra === "scheduled" ? "default" : "outline"}
                  className="h-9 shrink-0 rounded-xl px-3 text-sm"
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
                  size="lg"
                  variant={visitExtra === "visited" ? "default" : "outline"}
                  className="h-9 shrink-0 rounded-xl px-3 text-sm"
                  onClick={() =>
                    setVisitExtra((v) => (v === "visited" ? "none" : "visited"))
                  }
                >
                  العملاء التي تمت زيارتهم فعلياً
                </Button>
              </div>
            </div>
          </div>
        </div>
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

      {!dashboardMode ? (
      <div
        className={cn(
          "sticky top-14 z-30 mb-3 rounded-2xl border bg-card/90 p-4 shadow-md backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 dark:border-border/50",
          "border-destructive/25 shadow-[0_8px_30px_-12px_hsl(var(--destructive)/0.35)] ring-1 ring-destructive/10"
        )}
      >
        <div
          className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-4"
          dir="rtl"
        >
            <div
              data-gate-exempt
              className="min-w-0 flex-1 overflow-hidden rounded-xl border border-destructive/20 bg-gradient-to-br from-destructive/[0.06] via-background to-background shadow-sm dark:from-destructive/10 dark:via-background"
            >
              <div className="flex items-start gap-3 border-b border-destructive/15 px-4 py-3">
                <span
                  className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/12 text-destructive shadow-inner dark:bg-destructive/20"
                  aria-hidden
                >
                  <AlertTriangle className="size-5" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-base font-semibold leading-tight text-destructive">
                    تجاوزات التقرير
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    اختر نوع التجاوز أو أدخل رقماً بجانب الزر المناسب، ثم راقب
                    شريط الحالة أسفل الصندوق.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 p-3 sm:gap-2.5">
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/25 px-2 py-1 shadow-sm dark:bg-muted/20">
                  <Button
                    type="button"
                    variant="ghost"
                    className={violChip(violation === "days_over")}
                    onClick={() => {
                      setViolation((x) =>
                        x === "days_over" ? null : "days_over"
                      );
                      setDaysActive(true);
                    }}
                  >
                    تجاوز عدد أيام
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-14 rounded-lg border-border/70 bg-background px-1 text-center text-sm font-medium tabular-nums shadow-inner disabled:opacity-45"
                    disabled={!daysActive}
                    value={daysInput}
                    onChange={(e) => setDaysInput(e.target.value)}
                    dir="ltr"
                    aria-label="عدد الأيام للتجاوز"
                  />
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/25 px-2 py-1 shadow-sm dark:bg-muted/20">
                  <Button
                    type="button"
                    variant="ghost"
                    className={violChip(violation === "follow_count")}
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
                    className="h-9 w-14 rounded-lg border-border/70 bg-background px-1 text-center text-sm font-medium tabular-nums shadow-inner disabled:opacity-45"
                    disabled={!followActive}
                    value={followInput}
                    onChange={(e) => setFollowInput(e.target.value)}
                    dir="ltr"
                    aria-label="عدد المتابعات للتجاوز"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className={violChip(violation === "neglected")}
                  title="يشمل من تجاوز موعد المتابعة دون متابعة مسجّلة لاحقاً، ومن لا يوجد لهم تاريخ متابعة تالية محدد."
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
                  variant="ghost"
                  className={violChip(violation === "no_answer")}
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
                  variant="outline"
                  className="h-9 shrink-0 rounded-xl border-dashed px-3 text-sm text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
                  onClick={() => {
                    setViolation(null);
                    setDaysInput("");
                    setFollowInput("");
                    setDaysActive(false);
                    setFollowActive(false);
                    setVisitOverdueOnly(false);
                  }}
                >
                  إلغاء كل الفلاتر
                </Button>
              </div>
            </div>
        </div>
        {(violationMessage() ||
          visitOverdueFilterMessage() ||
          visitBanner()) ? (
          <div
            className="mt-4 space-y-2 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-4 py-4 text-base leading-relaxed text-destructive dark:bg-destructive/10"
            role="status"
          >
            {violationMessage() ? (
              <p className="text-[0.95rem] font-semibold leading-relaxed sm:text-[1.05rem]">
                {violationMessage()}
              </p>
            ) : null}
            {visitOverdueFilterMessage() ? (
              <p className="text-[0.95rem] font-semibold leading-relaxed sm:text-[1.05rem]">
                {visitOverdueFilterMessage()}
              </p>
            ) : null}
            {visitBanner() ? (
              <p className="text-[0.95rem] font-semibold leading-relaxed text-destructive/95 sm:text-[1.05rem]">
                {visitBanner()}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      ) : null}

      <TooltipProvider delayDuration={180}>
      <div
        ref={reportBScrollRef}
        data-report-b-scroll
        className="min-w-0 w-full rounded-xl border border-border/60 shadow-sm"
      >
          <Table
            containerDir="rtl"
            containerClassName={
              dashboardMode
                ? "max-h-[min(38vh,320px)]"
                : "max-h-[min(70vh,calc(100vh-11rem))]"
            }
            className={cn(
              "min-w-[3200px] text-sm [&_td]:whitespace-normal [&_td]:align-top",
              "[&_th]:!border-s [&_th]:!border-border/50 [&_td]:!border-s [&_td]:!border-border/50",
              "[&_tr]:!border-b [&_tr]:!border-border/40",
              "dark:[&_th]:!border-border/35 dark:[&_td]:!border-border/35 dark:[&_tr]:!border-border/30"
            )}
          >
            <TableHeader>
              <TableRow className="bg-muted/60 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-muted/95 [&_th]:shadow-[0_1px_0_0_hsl(var(--border))]">
                {toolbar === "closed" ? (
                  <>
                    <TableHead className="min-w-[110px]">تاريخ الإغلاق</TableHead>
                    <TableHead className="min-w-[72px]">الحالة</TableHead>
                    <TableHead className="min-w-[140px]">سبب الإغلاق</TableHead>
                  </>
                ) : null}
                <TableHead className="sticky right-0 top-0 z-30 min-w-[120px] bg-muted/95 shadow-[0_1px_0_0_hsl(var(--border))]">
                  إجراءات
                </TableHead>
                <TableHead className="min-w-[170px]">متابعة تالية</TableHead>
                <TableHead className="min-w-[140px]">توصيات الإدارة</TableHead>
                <TableHead className="min-w-[120px]">تاريخ التوصية</TableHead>
                <TableHead className="min-w-[90px]">سيلز</TableHead>
                <TableHead className="min-w-[10rem] whitespace-normal text-start leading-tight">
                  شركة
                </TableHead>
                <TableHead className="w-12">أيام</TableHead>
                <TableHead className="min-w-[100px]">اتصال</TableHead>
                <TableHead className="min-w-[9rem] whitespace-normal text-start leading-tight">
                  اسم المسئول
                </TableHead>
                <TableHead className="min-w-[9rem]">نشاط</TableHead>
                <TableHead className="min-w-[9rem]">وظيفة</TableHead>
                <TableHead className="min-w-[120px]">عنوان</TableHead>
                <TableHead className="min-w-[110px]">هاتف</TableHead>
                <TableHead className="min-w-[72px]">عرض سعر</TableHead>
                <TableHead className="min-w-[120px]">تفصيل السعر</TableHead>
                <TableHead className="min-w-[10rem] max-w-[13rem] whitespace-normal text-start leading-tight">
                  ملخص المكالمة والموقف
                </TableHead>
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
                <TableHead className="min-w-[8.5rem] px-1 text-center align-middle">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full min-w-0 px-1.5 text-[11px] font-semibold leading-tight"
                    title="إضافة عمود متابعة للجدول (لا يُنشئ صفوفاً فارغة في البيانات حتى تُدخل نصاً أو تاريخاً)"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFollowColExtra((c) => Math.min(c + 1, 998));
                    }}
                  >
                    + إضافة متابعة
                  </Button>
                </TableHead>
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
                const classificationTooltip = fullCellTooltip(
                  r.classificationLabel ??
                    classifications.find((c) => c.id === r.classificationId)
                      ?.label ??
                    (r.classificationId ? r.classificationId : "")
                );
                const rowHighlightStyle: CSSProperties | undefined =
                  focusedRowId === r.id
                    ? {
                        boxShadow: dashboardMode
                          ? "inset 0 0 0 9999px rgba(16, 185, 129, 0.06)"
                          : "inset 0 0 0 9999px rgba(16, 185, 129, 0.13)",
                      }
                    : undefined;

                return (
                  <TableRow
                    key={r.id}
                    data-gate-row={gateClientId === r.id ? r.id : undefined}
                    data-focused-row={focusedRowId === r.id ? "true" : undefined}
                    className="cursor-pointer align-top transition-shadow duration-200"
                    style={rowHighlightStyle}
                    onPointerDownCapture={() => setFocusedRowId(r.id)}
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
                                  r.id,
                                  { reportKey: resolvedAuditReportKey }
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
                        {toolbar !== "closed" ? (
                        <StatusPopoverBlock
                          clientId={r.id}
                          classifications={notBClassifications}
                          auditReportKey={resolvedAuditReportKey}
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
                        <Button
                          type="button"
                          variant={
                            Object.keys(local[r.id] ?? {}).length > 0
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="h-7 w-full px-1 text-[11px] leading-tight"
                          disabled={
                            savingRowId !== null ||
                            Object.keys(local[r.id] ?? {}).length === 0
                          }
                          title={
                            Object.keys(local[r.id] ?? {}).length === 0
                              ? "عدّل حقلًا في الصف ثم اضغط حفظ"
                              : "حفظ تعديلات هذا الصف"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            void saveRow(r.id);
                          }}
                        >
                          {savingRowId === r.id ? "جاري…" : "حفظ الصف"}
                        </Button>
                        <div
                          dir="ltr"
                          className="mt-1.5 flex flex-nowrap items-center justify-center gap-0.5 border-t border-border/50 pt-1.5 dark:border-border/40"
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="size-7 shrink-0"
                            title="الانتقال لأقصى اليسار (بداية الصف في التمرير)"
                            aria-label="الانتقال لأقصى اليسار"
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollReportBHorizontalToEdge("start");
                            }}
                          >
                            <ArrowLeftToLine className="size-4" aria-hidden />
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
                            <ChevronLeft className="size-4" aria-hidden />
                          </Button>
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
                            <ChevronRight className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="size-7 shrink-0"
                            title="الانتقال لأقصى اليمين (نهاية الصف في التمرير)"
                            aria-label="الانتقال لأقصى اليمين"
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollReportBHorizontalToEdge("end");
                            }}
                          >
                            <ArrowRightToLine className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(
                          isoToDateInput(r.nextFollowUpAt)
                        )}
                      >
                        <Input
                          type="date"
                          className={cn(
                            reportBInput,
                            "min-w-[11rem] text-left tabular-nums"
                          )}
                          dir="ltr"
                          disabled={savingRowId === r.id}
                          value={isoToDateInput(r.nextFollowUpAt)}
                          onChange={(e) => {
                            const nextFollowUpAt = dateInputToIso(
                              e.target.value
                            );
                            const nextFollowUpAtStr =
                              nextFollowUpAt ?? "";
                            onField(r.id, r, {
                              nextFollowUpAt: nextFollowUpAtStr,
                            });
                            if (
                              gateClientId === r.id &&
                              nextFollowUpMeetsGate(nextFollowUpAtStr)
                            ) {
                              setGateClientId(null);
                            }
                          }}
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(
                          r.managementRecommendationText
                        )}
                      >
                        <Textarea
                          rows={2}
                          className={reportBTextarea}
                          disabled={savingRowId === r.id}
                          value={r.managementRecommendationText ?? ""}
                          onChange={(e) =>
                            onField(r.id, r, {
                              managementRecommendationText: e.target.value,
                            })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(mgmtDateStr)}
                      >
                        <Input
                          type="date"
                          dir="ltr"
                          className={cn(reportBInput, "text-left")}
                          disabled={savingRowId === r.id}
                          value={mgmtDateStr}
                          onChange={(e) =>
                            onField(r.id, r, {
                              managementRecommendationDate: dateInputToIso(
                                e.target.value
                              ),
                            })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.assignedUserName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(r.company)}
                      >
                        <Textarea
                          rows={2}
                          className={reportBTextarea}
                          disabled={savingRowId === r.id}
                          value={r.company ?? ""}
                          onChange={(e) =>
                            onField(r.id, r, { company: e.target.value })
                          }
                        />
                      </ReportFieldTooltip>
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
                      <ReportFieldTooltip tooltip={fullCellTooltip(r.name)}>
                        <Textarea
                          rows={2}
                          className={reportBTextarea}
                          disabled={savingRowId === r.id}
                          value={r.name}
                          onChange={(e) =>
                            onField(r.id, r, { name: e.target.value })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(r.activity)}
                      >
                        <Textarea
                          rows={2}
                          className={reportBTextarea}
                          disabled={savingRowId === r.id}
                          value={r.activity ?? ""}
                          onChange={(e) =>
                            onField(r.id, r, { activity: e.target.value })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(r.position)}
                      >
                        <Textarea
                          rows={2}
                          className={reportBTextarea}
                          disabled={savingRowId === r.id}
                          value={r.position ?? ""}
                          onChange={(e) =>
                            onField(r.id, r, { position: e.target.value })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(r.address)}
                      >
                        <Textarea
                          rows={2}
                          className={cn(reportBTextarea, "min-w-[12rem]")}
                          value={r.address ?? ""}
                          disabled={savingRowId === r.id}
                          onChange={(e) =>
                            onField(r.id, r, { address: e.target.value })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell dir="ltr">
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(
                          [r.phone, r.phone2].filter(Boolean).join(" / ")
                        )}
                      >
                        <Textarea
                          rows={2}
                          className={cn(
                            reportBTextarea,
                            "min-w-[11rem] text-left"
                          )}
                          value={[r.phone, r.phone2]
                            .filter(Boolean)
                            .join(" / ")}
                          disabled={savingRowId === r.id}
                          onChange={(e) => {
                            const parts = e.target.value.split(/\s*\/\s*/);
                            onField(r.id, r, {
                              phone: parts[0]?.trim() ?? "",
                              phone2: parts[1]?.trim() || null,
                            });
                          }}
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell dir="ltr">
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(r.quotePrice)}
                      >
                        <Textarea
                          rows={2}
                          className={cn(
                            reportBTextarea,
                            "min-w-[6rem] text-left tabular-nums"
                          )}
                          value={r.quotePrice ?? ""}
                          disabled={savingRowId === r.id}
                          onChange={(e) =>
                            onField(r.id, r, { quotePrice: e.target.value })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(r.quoteDetail)}
                      >
                        <Textarea
                          rows={2}
                          className={reportBTextarea}
                          disabled={savingRowId === r.id}
                          value={r.quoteDetail ?? ""}
                          onChange={(e) =>
                            onField(r.id, r, { quoteDetail: e.target.value })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(combinedNote)}
                      >
                        <Textarea
                          rows={2}
                          className={reportBTextarea}
                          disabled={savingRowId === r.id}
                          value={combinedNote}
                          onChange={(e) => {
                            const sp = splitCallAndSituation(e.target.value);
                            onField(r.id, r, {
                              callSummary: sp.callSummary,
                              currentSituation: sp.currentSituation,
                            });
                          }}
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(r.salesNotes)}
                      >
                        <Textarea
                          rows={2}
                          className={reportBTextarea}
                          disabled={savingRowId === r.id}
                          value={r.salesNotes ?? ""}
                          onChange={(e) =>
                            onField(r.id, r, { salesNotes: e.target.value })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip tooltip={classificationTooltip}>
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
                        <SelectTrigger
                          className={cn(
                            reportBSelectTrigger,
                            "max-w-full min-w-0 justify-between"
                          )}
                          dir="rtl"
                        >
                          <SelectValue placeholder="—">
                            {(v) => {
                              if (
                                v == null ||
                                v === "" ||
                                v === "__none__"
                              ) {
                                return "—";
                              }
                              const fromList = classifications.find(
                                (c) => c.id === String(v)
                              );
                              if (fromList) {
                                const lab = sanitizeDisplayLabel(
                                  fromList.label
                                );
                                return (
                                  <span
                                    className="flex min-w-0 flex-1 items-center gap-1.5"
                                    dir="rtl"
                                  >
                                    <span
                                      className="inline-block size-2.5 shrink-0 rounded-sm border border-border"
                                      style={{
                                        backgroundColor: fromList.color,
                                      }}
                                      aria-hidden
                                    />
                                    <bdi className="min-w-0 truncate">
                                      {lab}
                                    </bdi>
                                  </span>
                                );
                              }
                              const lab = sanitizeDisplayLabel(
                                r.classificationLabel ?? String(v)
                              );
                              const col =
                                r.classificationColor ?? "#94a3b8";
                              return (
                                <span
                                  className="flex min-w-0 flex-1 items-center gap-1.5"
                                  dir="rtl"
                                >
                                  <span
                                    className="inline-block size-2.5 shrink-0 rounded-sm border border-border"
                                    style={{ backgroundColor: col }}
                                    aria-hidden
                                  />
                                  <bdi className="min-w-0 truncate">{lab}</bdi>
                                </span>
                              );
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" label="—">
                            —
                          </SelectItem>
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
                            return opts.map((c) => {
                              const lab = sanitizeDisplayLabel(c.label);
                              return (
                                <SelectItem
                                  key={c.id}
                                  value={c.id}
                                  label={lab}
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      className="inline-block size-2.5 shrink-0 rounded-sm border border-border"
                                      style={{ backgroundColor: c.color }}
                                      aria-hidden
                                    />
                                    <bdi className="min-w-0 truncate">
                                      {lab}
                                    </bdi>
                                  </span>
                                </SelectItem>
                              );
                            });
                          })()}
                        </SelectContent>
                      </Select>
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(r.adPlatform)}
                      >
                        <Textarea
                          rows={2}
                          className={reportBTextarea}
                          disabled={savingRowId === r.id}
                          value={r.adPlatform ?? ""}
                          onChange={(e) =>
                            onField(r.id, r, { adPlatform: e.target.value })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(r.sourceAdName)}
                      >
                        <Textarea
                          rows={2}
                          className={reportBTextarea}
                          disabled={savingRowId === r.id}
                          value={r.sourceAdName ?? ""}
                          onChange={(e) =>
                            onField(r.id, r, { sourceAdName: e.target.value })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={
                          r.visitAppointmentScheduled
                            ? "زيارة مجدولة: نعم"
                            : "زيارة مجدولة: لا"
                        }
                      >
                        <span className="inline-flex items-center">
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={r.visitAppointmentScheduled}
                            disabled={savingRowId === r.id}
                            onChange={(e) =>
                              onField(r.id, r, {
                                visitAppointmentScheduled: e.target.checked,
                              })
                            }
                          />
                        </span>
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(
                          isoToDateInput(r.visitAppointmentDate)
                        )}
                      >
                        <Input
                          type="date"
                          dir="ltr"
                          className={cn(reportBInput, "text-left")}
                          disabled={savingRowId === r.id}
                          value={isoToDateInput(r.visitAppointmentDate)}
                          onChange={(e) =>
                            onField(r.id, r, {
                              visitAppointmentDate: dateInputToIso(
                                e.target.value
                              ),
                            })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(r.presentingEmployeeName)}
                      >
                        <Textarea
                          rows={2}
                          className={reportBTextarea}
                          disabled={savingRowId === r.id}
                          value={r.presentingEmployeeName ?? ""}
                          onChange={(e) =>
                            onField(r.id, r, {
                              presentingEmployeeName: e.target.value,
                            })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(
                          r.qqAnswer === null
                            ? ""
                            : r.qqAnswer
                              ? "نعم"
                              : "لا"
                        )}
                      >
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
                            <SelectItem value="__none__" label="—">
                              —
                            </SelectItem>
                            <SelectItem value="yes" label="نعم">
                              نعم
                            </SelectItem>
                            <SelectItem value="no" label="لا">
                              لا
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </ReportFieldTooltip>
                    </TableCell>
                    <TableCell>
                      <ReportFieldTooltip
                        tooltip={fullCellTooltip(r.finalStatusNote)}
                      >
                        <Textarea
                          rows={2}
                          className={reportBTextarea}
                          disabled={savingRowId === r.id}
                          value={r.finalStatusNote ?? ""}
                          onChange={(e) =>
                            onField(r.id, r, {
                              finalStatusNote: e.target.value,
                            })
                          }
                        />
                      </ReportFieldTooltip>
                    </TableCell>
                    {Array.from({ length: maxFollowCols }, (_, i) => {
                      const slot = slots[i];
                      return (
                        <Fragment key={`${r.id}-slot-${i}`}>
                          <TableCell>
                            <ReportFieldTooltip
                              tooltip={fullCellTooltip(slot?.note)}
                            >
                              <Textarea
                                rows={2}
                                className={reportBTextarea}
                                disabled={savingRowId === r.id}
                                value={slot?.note ?? ""}
                                onChange={(e) => {
                                  const next = [...slots];
                                  while (next.length <= i) {
                                    next.push({
                                      order: next.length + 1,
                                      note: "",
                                      date: "",
                                    });
                                  }
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
                            </ReportFieldTooltip>
                          </TableCell>
                          <TableCell>
                            <ReportFieldTooltip
                              tooltip={fullCellTooltip(
                                slot?.date
                                  ? isoToDateInput(slot.date)
                                  : ""
                              )}
                            >
                              <Input
                                type="date"
                                dir="ltr"
                                className={cn(reportBInput, "text-left")}
                                disabled={savingRowId === r.id}
                                value={
                                  slot?.date
                                    ? isoToDateInput(slot.date)
                                    : ""
                                }
                                onChange={(e) => {
                                  const next = [...slots];
                                  while (next.length <= i) {
                                    next.push({
                                      order: next.length + 1,
                                      note: "",
                                      date: "",
                                    });
                                  }
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
                            </ReportFieldTooltip>
                          </TableCell>
                        </Fragment>
                      );
                    })}
                    <TableCell className="w-12 bg-muted/20" aria-hidden />
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
      </TooltipProvider>
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
  auditReportKey,
}: {
  clientId: string;
  classifications: ClassificationRow[];
  open: "menu" | "close" | "notb" | "won" | null;
  setOpen: (v: "menu" | "close" | "notb" | "won" | null) => void;
  onDone: (hideId?: string) => void;
  gateInvalid: boolean;
  onBlocked: () => void;
  auditReportKey: string;
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
              onValueChange={(v) =>
                setClsId(!v || v === "__none__" ? "" : v)
              }
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
