"use client";

import { ClientStatus, type UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowLeftToLine,
  ArrowRightToLine,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import {
  patchClientReportFields,
  type ReportClientPatchInput,
} from "@/app/actions/report-client-patch";
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
import { SalesFilterRecordsStatus } from "@/components/reports/sales-filter-records-status";
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
import { ReportBTableBodyRow } from "@/components/reports/report-b-table-body-row";
import type { ClassificationRow } from "@/lib/data/classifications";
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
  validateNextFollowUpAtForRowSave,
  type SortTriState,
  type ViolationKind,
} from "@/lib/report-b-utils";
import { classificationResolvesToBPath } from "@/lib/pipeline-choice";
import {
  followSlotsToJson,
  nextFollowUpMeetsGate,
  normalizeFollowSlots,
  trimTrailingEmptyFollowSlots,
} from "@/lib/report-b-table-helpers";
import { cn } from "@/lib/utils";

/** توست أوضح وأكبر خطاً عند رفض حفظ الصف (مثل تاريخ «المتابعة التالية» غير المسموح). */
const reportRowSaveErrorToast = {
  duration: 12_000,
  classNames: {
    toast:
      "w-[min(32rem,calc(100vw-1.5rem))] !items-start !gap-3 !py-4 !px-4 sm:!px-5",
    title: "!text-base sm:!text-lg !font-semibold !leading-relaxed",
    content: "!text-base sm:!text-lg !font-semibold !leading-relaxed",
    icon: "!size-6 shrink-0 [&_svg]:!size-6",
  },
} as const;

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
  /** تقرير تم البيع — عرض فقط */
  saleDate?: string | null;
  contractValue?: string | null;
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
  /** فلتر السيلز (نص) — العدد يُحسب داخلياً من الصفوف بعد كل فلاتر الجدول */
  activeSalesName?: string | null;
  /** أعمدة تاريخ التعاقد وقيمة البيع بعد «إجراءات» (تقرير تم البيع) */
  wonSaleColumns?: boolean;
  /** لو false يُخفى صندوق «تجاوزات التقرير» وشريط رسالته */
  showViolationPanel?: boolean;
  /** لو false يُخفى صندوق «ترتيب الأعمدة» و«فلتر الزيارة» */
  showSortAndVisitToolbar?: boolean;
  /** لو false لا يُعرض شريط «المعروض في الصفحة: N سجلًا» (وتنبيه السيلز إن وُجد) */
  showSalesFilterRecordsStatus?: boolean;
};

function patchFromReportBRow(row: ReportBRow): ReportClientPatchInput {
  const slots = trimTrailingEmptyFollowSlots(
    normalizeFollowSlots(row.followUpSlots)
  );

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
    followUpSlots: followSlotsToJson(slots),
    classificationId: row.classificationId,
  };

  out.managementRecommendationDate =
    row.managementRecommendationDate && row.managementRecommendationDate.trim() !== ""
      ? row.managementRecommendationDate
      : "";

  return out;
}

export function ReportBTable({
  rows,
  classifications,
  rowStyleReportType = "b",
  toolbar = "full",
  auditReportKey,
  workLogUserId,
  workLogUserRole = "SALES",
  activeSalesName = null,
  wonSaleColumns = false,
  showViolationPanel = true,
  showSortAndVisitToolbar = true,
  showSalesFilterRecordsStatus = true,
}: Props) {
  const router = useRouter();
  const [local, setLocal] = useState<Record<string, Partial<ReportBRow>>>({});
  /** فلاتر/فرز على نسخة مؤجّلة من ‎local‎ حتى لا يُعاد تمرير آلاف الحقول عند كل حرف في المحرر */
  const deferredLocal = useDeferredValue(local);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const reportBScrollRef = useRef<HTMLDivElement | null>(null);

  /** حاوية التمرير فعلياً (وليس الـ div الخارجي). */
  const getReportBScrollContainer = useCallback((): HTMLElement | null => {
    const root = reportBScrollRef.current;
    if (!root) return null;
    return (
      root.querySelector<HTMLElement>('[data-slot="table-container"]') ?? root
    );
  }, []);

  /**
   * حاوية ‎dir=ltr‎ + جدول واسع ‎min-w-[3200px]‎:
   * ‎scrollLeft: 0‎ = يظهر جانب **بداية** شريط التمرير (يسار المربع الواسع = أوّل أعمدة الـDOM).
   * ‎scrollLeft: max‎ = يظهر جانب **نهاية** شريط التمرير = غالباً عمود «إجراءات» (يمين) — الافتراضي بعد ‎F5/refresh.
   * بعد التحميل ‎scrollWidth‎ قد يتأخّر؛ نستخدم ‎ResizeObserver‎ + إعادات قصيرة.
   */
  const scrollReportBHorizontal = useCallback(
    (direction: -1 | 1) => {
      const el = getReportBScrollContainer();
      if (!el) return;
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const step = Math.max(280, Math.round(el.clientWidth * 0.42));
      el.scrollBy({ left: direction * step, behavior: "smooth" });
    },
    [getReportBScrollContainer]
  );

  const scrollReportBToScrollEdge = useCallback(
    (edge: "min" | "max") => {
      const el = getReportBScrollContainer();
      if (!el) return;
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      const left = edge === "min" ? 0 : max;
      el.scrollTo({ left, behavior: "smooth" });
    },
    [getReportBScrollContainer]
  );

  /** مفتاح بيانات الصفوف — يتغيّر عند إعادة جلب القائمة فيُعاد محاذاة التمرير. */
  const rowDataSignature = useMemo(
    () => rows.map((r) => r.id).join("\0"),
    [rows]
  );

  useLayoutEffect(() => {
    const el = getReportBScrollContainer();
    if (!el) return;

    /** وضع التمرير على «أوّل» الجدول بمعنى **عمود الإجراءات** (يمين / ‎scrollLeft = max). */
    const alignTableToActionColumn = () => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      el.scrollTo({ left: max, behavior: "auto" });
    };

    const runWithRetries = () => {
      alignTableToActionColumn();
      const r1 = requestAnimationFrame(() => {
        requestAnimationFrame(alignTableToActionColumn);
      });
      const t0 = setTimeout(alignTableToActionColumn, 0);
      const t1 = setTimeout(alignTableToActionColumn, 100);
      const t2 = setTimeout(alignTableToActionColumn, 400);
      return () => {
        cancelAnimationFrame(r1);
        clearTimeout(t0);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    };

    const cleanRetries = runWithRetries();
    const ro = new ResizeObserver(() => {
      alignTableToActionColumn();
    });
    ro.observe(el);
    return () => {
      cleanRetries();
      ro.disconnect();
    };
  }, [getReportBScrollContainer, rowDataSignature, toolbar, rowStyleReportType]);

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [reopeningClientId, setReopeningClientId] = useState<string | null>(
    null
  );
  /** تقرير Not B: لا يُعرض صف مسار B في قائمة التصنيف لتفادي قوائم فارغة/قيم غير مطابقة */
  const tableClassificationOptions = useMemo(
    () =>
      rowStyleReportType === "not-b"
        ? classifications.filter((c) => !classificationResolvesToBPath(c))
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
  /** يؤخر إعادة فلترة/فرز الجدول الكبير حتى يبقى حقل البحث سريع الاستجابة */
  const deferredSearchQ = useDeferredValue(searchQ);
  const [violation, setViolation] = useState<ViolationKind>(null);
  const [daysInput, setDaysInput] = useState("");
  const [followInput, setFollowInput] = useState("");
  const deferredDaysInput = useDeferredValue(daysInput);
  const deferredFollowInput = useDeferredValue(followInput);
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

  /** عرض/حفظ/بوابة: دمج فوري — القيم تظهر فور الكتابة. */
  const merged = useMemo(() => {
    return rows.map((r) => {
      const patch = local[r.id];
      if (patch == null) return r;
      return { ...r, ...patch };
    });
  }, [rows, local]);

  /** فلاتر وترتيب وقائمة الظهور: دمج مؤجّل — يُرخى عن الحلقة الثقيلة أثناء الكتابة. */
  const mergedForFilters = useMemo(() => {
    return rows.map((r) => {
      const patch = deferredLocal[r.id];
      if (patch == null) return r;
      return { ...r, ...patch };
    });
  }, [rows, deferredLocal]);

  const mergedMap = useMemo(() => {
    const m = new Map<string, ReportBRow>();
    for (const r of merged) m.set(r.id, r);
    return m;
  }, [merged]);

  const mergedMapRef = useRef(mergedMap);
  mergedMapRef.current = mergedMap;

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

  const saveRow = useCallback(
    async (id: string, pendingOverlay?: Partial<ReportBRow>) => {
      const base = mergedMapRef.current.get(id);
      if (!base) return false;
      const row = { ...base, ...pendingOverlay };
      const followUpCheck = validateNextFollowUpAtForRowSave(row.nextFollowUpAt);
      if (!followUpCheck.ok) {
        toast.error(followUpCheck.message, reportRowSaveErrorToast);
        return false;
      }
      setSavingRowId(id);
      try {
        const res = await patchClientReportFields(
          id,
          patchFromReportBRow(row),
          {
            reportKey: resolvedAuditReportKey,
          }
        );
        if (res.ok) {
          toast.success("تم حفظ الصف");
          setLocal((p) => {
            const n = { ...p };
            delete n[id];
            return n;
          });
          router.refresh();
          return true;
        }
        toast.error(res.message, reportRowSaveErrorToast);
        return false;
      } catch {
        return false;
      } finally {
        setSavingRowId(null);
      }
    },
    [router, resolvedAuditReportKey]
  );

  const onField = useCallback(
    (id: string, patch: Partial<ReportBRow>) => {
      setLocal((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? {}), ...patch },
      }));
    },
    []
  );

  const filteredByViolation = useMemo(() => {
    const list = mergedForFilters.filter((r) => {
      if (violation === "days_over") {
        const n = Number(deferredDaysInput);
        if (!Number.isFinite(n)) return false;
        return passesDaysOver(r, n);
      }
      if (violation === "follow_count") {
        const n = Number(deferredFollowInput);
        if (!Number.isFinite(n)) return false;
        return passesFollowCount(r, n);
      }
      if (violation === "neglected") return passesNeglected(r);
      if (violation === "no_answer") return passesNoAnswerFilter(r.followUpSlots);
      return true;
    });
    if (!visitOverdueOnly) return list;
    return list.filter((r) => passesVisitOverdue(r));
  }, [
    mergedForFilters,
    violation,
    deferredDaysInput,
    deferredFollowInput,
    visitOverdueOnly,
  ]);

  const filteredVisit = useMemo(() => {
    if (visitExtra === "scheduled")
      return filteredByViolation.filter((r) => passesVisitScheduledOnly(r));
    if (visitExtra === "visited")
      return filteredByViolation.filter((r) => passesActuallyVisited(r));
    return filteredByViolation;
  }, [filteredByViolation, visitExtra]);

  const searched = useMemo(() => {
    const q = deferredSearchQ.trim().toLowerCase();
    if (!q) return filteredVisit;
    return filteredVisit.filter((r) => matchesSearch(r, q));
  }, [filteredVisit, deferredSearchQ]);

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
  }, [searched, hiddenIds, sortDays, sortPrice, sortCall, sortFollowUp]);

  const maxFollowCols = useMemo(() => {
    let m = 0;
    for (const r of merged) {
      const n = normalizeFollowSlots(r.followUpSlots).length;
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
      return "يعرض العملاء الذين في عمود «متابعة تالية» لا تاريخ، أو تاريخ غير صالح، أو تاريخ قبل اليوم (وفق التوقيت المحلي). من في العمود يوم اليوم أو لاحقاً لا يظهر هنا.";
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

  const notBClassifications = classifications.filter(
    (c) => !classificationResolvesToBPath(c)
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        dashboardMode && "gap-2"
      )}
    >
      {!dashboardMode && showSalesFilterRecordsStatus ? (
        <SalesFilterRecordsStatus
          count={visibleRows.length}
          activeSalesName={activeSalesName}
        />
      ) : null}
      <div
        data-gate-exempt
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm backdrop-blur-sm dark:bg-card/50"
        dir="rtl"
      >
        {workLogUserId ? (
          <ReportWorkLogDialog
            key={resolvedAuditReportKey}
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

      {!dashboardMode && showSortAndVisitToolbar ? (
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

      {!dashboardMode && showViolationPanel ? (
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
                  title="عمود «متابعة تالية» فاضٍ، أو تاريخ غير صالح، أو تاريخ قبل اليوم. الخانات الإضافية لا تلغي الفلتر."
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
            containerDir="ltr"
            tableDir="rtl"
            containerClassName={
              dashboardMode
                ? // رأس الجدول (h-11) + ≈3 صفوف — تمرير رأسي لبقية الصفوف
                  "max-h-[min(17rem,42svh)] overscroll-y-contain"
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
                {wonSaleColumns ? (
                  <>
                    <TableHead className="min-w-[120px]">تاريخ التعاقد</TableHead>
                    <TableHead className="min-w-[100px]">قيمة البيع</TableHead>
                  </>
                ) : null}
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
              {visibleRows.map((rFiltered) => {
                const r = mergedMap.get(rFiltered.id) ?? rFiltered;
                return (
                  <ReportBTableBodyRow
                    key={r.id}
                    r={r}
                    isGateClientRow={gateClientId === r.id}
                    isFocused={focusedRowId === r.id}
                    isSaving={savingRowId === r.id}
                    savingInProgress={savingRowId !== null}
                    gateBlockActive={!!(gateInvalid && gateClientId === r.id)}
                    isReopening={reopeningClientId === r.id}
                    panelView={
                      panel?.clientId === r.id ? panel.view : null
                    }
                    localEntry={local[r.id]}
                    maxFollowCols={maxFollowCols}
                    dashboardMode={dashboardMode}
                    toolbar={toolbar}
                    classifications={classifications}
                    tableClassificationOptions={tableClassificationOptions}
                    notBClassifications={notBClassifications}
                    resolvedAuditReportKey={resolvedAuditReportKey}
                    onField={onField}
                    onSaveRow={saveRow}
                    onSetFocusedRowId={setFocusedRowId}
                    onSetGateDialogOpen={setGateDialogOpen}
                    onSetHiddenIds={setHiddenIds}
                    onSetPanel={setPanel}
                    onSetReopeningClientId={setReopeningClientId}
                    onSetGateClientId={setGateClientId}
                    scrollReportBHorizontal={scrollReportBHorizontal}
                    scrollReportBToScrollEdge={scrollReportBToScrollEdge}
                    router={router}
                    wonSaleColumns={wonSaleColumns}
                  />
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
