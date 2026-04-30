"use client";

import Link from "next/link";
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { toast } from "sonner";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { reopenClosedClientFromReport } from "@/app/actions/report-b-transitions";
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
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ReportBStatusPopoverBlock } from "@/components/reports/report-b-status-popover-block";
import { ReportFieldTooltip } from "@/components/reports/report-field-tooltip";
import type { ClassificationRow } from "@/lib/data/classifications";
import { formatDateArabicLong, todayInputDate } from "@/lib/date-arabic";
import { sanitizeDisplayLabel } from "@/lib/display-text";
import { daysElapsedSinceContact } from "@/lib/days-elapsed";
import {
  dateInputToIso,
  followSlotsToJson,
  fullCellTooltip,
  isoToDateInput,
  mergedCallAndSituation,
  nextFollowUpMeetsGate,
  normalizeFollowSlots,
  reportBInput,
  reportBSelectTrigger,
  reportBTextarea,
  splitCallAndSituation,
} from "@/lib/report-b-table-helpers";
import { cn } from "@/lib/utils";
import type { ReportBRow } from "./report-b-table";

type AppRouterInstance = {
  push: (href: string) => void;
};

export type ReportBTableBodyRowProps = {
  r: ReportBRow;
  isGateClientRow: boolean;
  isFocused: boolean;
  isSaving: boolean;
  savingInProgress: boolean;
  gateBlockActive: boolean;
  isReopening: boolean;
  panelView: "menu" | "close" | "notb" | "won" | null;
  localEntry: Partial<ReportBRow> | undefined;
  maxFollowCols: number;
  dashboardMode: boolean;
  toolbar: "full" | "closed" | "dashboard";
  classifications: ClassificationRow[];
  tableClassificationOptions: ClassificationRow[];
  notBClassifications: ClassificationRow[];
  resolvedAuditReportKey: string;
  onField: (id: string, patch: Partial<ReportBRow>) => void;
  onSaveRow: (
    id: string,
    pendingOverlay?: Partial<ReportBRow>
  ) => void | Promise<boolean>;
  onSetFocusedRowId: (id: string) => void;
  onSetGateDialogOpen: (open: boolean) => void;
  onSetHiddenIds: (fn: (prev: Set<string>) => Set<string>) => void;
  onSetPanel: (
    v: null | { clientId: string; view: "menu" | "close" | "notb" | "won" }
  ) => void;
  onSetReopeningClientId: (id: string | null) => void;
  onSetGateClientId: (id: string | null) => void;
  scrollReportBHorizontal: (direction: -1 | 1) => void;
  scrollReportBToScrollEdge: (edge: "min" | "max") => void;
  router: AppRouterInstance;
  wonSaleColumns?: boolean;
};

function ReportBTableBodyRowInner(p: ReportBTableBodyRowProps) {
  const {
    r,
    isGateClientRow,
    isFocused,
    isSaving,
    savingInProgress,
    gateBlockActive,
    isReopening,
    panelView,
    localEntry,
    maxFollowCols,
    dashboardMode,
    toolbar,
    classifications,
    tableClassificationOptions,
    notBClassifications,
    resolvedAuditReportKey,
    onField,
    onSaveRow,
    onSetFocusedRowId,
    onSetGateDialogOpen,
    onSetHiddenIds,
    onSetPanel,
    onSetReopeningClientId,
    onSetGateClientId,
    scrollReportBHorizontal,
    scrollReportBToScrollEdge,
    router,
    wonSaleColumns = false,
  } = p;

  /** مثل «توصيات الإدارة»: المسودة هنا — الـ parent يستقبل بمرئية debounce لتخفيف إعادة رسم الجدول. */
  const [rowOverlay, setRowOverlay] = useState<Partial<ReportBRow>>({});
  const rowOverlayRef = useRef<Partial<ReportBRow>>({});
  const debounceToParentRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SYNC_MS = 45;

  useEffect(() => {
    return () => {
      if (debounceToParentRef.current) {
        clearTimeout(debounceToParentRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setRowOverlay({});
    rowOverlayRef.current = {};
  }, [r.id]);

  const displayRow = useMemo(
    () => ({ ...r, ...rowOverlay } as ReportBRow),
    [r, rowOverlay]
  );

  const patchFieldDebounced = useCallback(
    (patch: Partial<ReportBRow>) => {
      const next = { ...rowOverlayRef.current, ...patch };
      rowOverlayRef.current = next;
      setRowOverlay(next);
      if (debounceToParentRef.current) {
        clearTimeout(debounceToParentRef.current);
      }
      debounceToParentRef.current = setTimeout(() => {
        debounceToParentRef.current = null;
        onField(r.id, rowOverlayRef.current);
      }, SYNC_MS);
    },
    [r.id, onField]
  );

  const patchFieldImmediate = useCallback(
    (patch: Partial<ReportBRow>) => {
      const next = { ...rowOverlayRef.current, ...patch };
      rowOverlayRef.current = next;
      setRowOverlay(next);
      onField(r.id, next);
    },
    [r.id, onField]
  );

  const days = daysElapsedSinceContact(
    displayRow.initialCallDate
      ? new Date(displayRow.initialCallDate)
      : null
  );
  const slots = normalizeFollowSlots(displayRow.followUpSlots);
  const mgmtDateStr = displayRow.managementRecommendationDate
    ? isoToDateInput(displayRow.managementRecommendationDate)
    : todayInputDate();
  const combinedNote = mergedCallAndSituation(
    displayRow.callSummary,
    displayRow.currentSituation
  );
  const classificationTooltip = fullCellTooltip(
    displayRow.classificationLabel ??
      classifications.find((c) => c.id === displayRow.classificationId)
        ?.label ??
      (displayRow.classificationId ? displayRow.classificationId : "")
  );

  const hasUnsavedInRow =
    Object.keys(rowOverlay).length > 0 ||
    Object.keys(localEntry ?? {}).length > 0;
  const rowHighlightStyle: CSSProperties | undefined = isFocused
    ? {
        boxShadow: dashboardMode
          ? "inset 0 0 0 9999px rgba(16, 185, 129, 0.06)"
          : "inset 0 0 0 9999px rgba(16, 185, 129, 0.13)",
      }
    : undefined;

  return (
  <TableRow
    data-gate-row={isGateClientRow ? r.id : undefined}
    data-focused-row={isFocused ? "true" : undefined}
    className="cursor-pointer align-top transition-shadow duration-200 [content-visibility:auto]"
    style={rowHighlightStyle}
    onPointerDownCapture={() => onSetFocusedRowId(r.id)}
    onClick={(e) => {
      if (gateBlockActive) {
        e.preventDefault();
        onSetGateDialogOpen(true);
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
            if (gateBlockActive) {
              e.preventDefault();
              onSetGateDialogOpen(true);
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
            disabled={isReopening}
            onClick={async (e) => {
              e.stopPropagation();
              onSetReopeningClientId(r.id);
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
                onSetReopeningClientId(null);
              }
            }}
          >
            {isReopening
              ? "جاري…"
              : "إعادة العميل"}
          </Button>
        ) : null}
        {toolbar !== "closed" ? (
        <ReportBStatusPopoverBlock
          clientId={r.id}
          clientStatus={r.status}
          classifications={notBClassifications}
          auditReportKey={resolvedAuditReportKey}
          gateInvalid={
            gateBlockActive
          }
          onBlocked={() => onSetGateDialogOpen(true)}
          onDone={(hid) => {
            if (hid)
              onSetHiddenIds((prev) => new Set(prev).add(hid));
            onSetPanel(null);
          }}
          open={panelView}
          setOpen={(v) =>
            onSetPanel(v ? { clientId: r.id, view: v } : null)
          }
        />
        ) : null}
        <Button
          type="button"
          variant={hasUnsavedInRow ? "default" : "outline"}
          size="sm"
          className="h-7 w-full px-1 text-[11px] leading-tight"
          disabled={savingInProgress || !hasUnsavedInRow}
          title={
            !hasUnsavedInRow
              ? "عدّل حقلًا في الصف ثم اضغط حفظ"
              : "حفظ تعديلات هذا الصف"
          }
          onClick={async (e) => {
            e.stopPropagation();
            if (debounceToParentRef.current) {
              clearTimeout(debounceToParentRef.current);
              debounceToParentRef.current = null;
            }
            const pending = rowOverlayRef.current;
            if (Object.keys(pending).length > 0) {
              onField(r.id, pending);
            }
            const res = await onSaveRow(r.id, pending);
            if (res) {
              setRowOverlay({});
              rowOverlayRef.current = {};
            }
          }}
        >
          {isSaving ? "جاري…" : "حفظ الصف"}
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
            title="قفز لآخر الحقول (نهاية الصف يساراً)"
            aria-label="نهاية الحقول"
            onClick={(e) => {
              e.stopPropagation();
              scrollReportBToScrollEdge("min");
            }}
          >
            <ArrowLeftToLine className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-7 shrink-0"
            title="تمرير نحو يسار (نحو نهاية الحقول)"
            aria-label="تمرير يسار"
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
            title="تمرير نحو يمين (نحو الإجراءات)"
            aria-label="تمرير يمين"
            onClick={(e) => {
              e.stopPropagation();
              scrollReportBHorizontal(1);
            }}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-7 shrink-0"
            title="قفز لعمود الإجراءات (بداية العرض من جهة اليمين)"
            aria-label="عمود الإجراءات"
            onClick={(e) => {
              e.stopPropagation();
              scrollReportBToScrollEdge("max");
            }}
          >
            <ArrowRightToLine className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </TableCell>
    {wonSaleColumns ? (
      <>
        <TableCell dir="ltr" className="text-xs whitespace-nowrap tabular-nums">
          {displayRow.saleDate
            ? formatDateArabicLong(new Date(displayRow.saleDate))
            : "—"}
        </TableCell>
        <TableCell dir="ltr" className="text-xs tabular-nums">
          {(displayRow.contractValue ?? "").trim() !== ""
            ? displayRow.contractValue
            : "—"}
        </TableCell>
      </>
    ) : null}
    <TableCell>
      <ReportFieldTooltip
        tooltip={fullCellTooltip(
          isoToDateInput(displayRow.nextFollowUpAt)
        )}
      >
        <Input
          type="date"
          className={cn(
            reportBInput,
            "min-w-[11rem] text-left tabular-nums"
          )}
          dir="ltr"
          disabled={isSaving}
          value={isoToDateInput(displayRow.nextFollowUpAt)}
          onChange={(e) => {
            const nextFollowUpAt = dateInputToIso(
              e.target.value
            );
            const nextFollowUpAtStr =
              nextFollowUpAt ?? "";
            patchFieldImmediate({
              nextFollowUpAt: nextFollowUpAtStr,
            });
            if (
              isGateClientRow &&
              nextFollowUpMeetsGate(nextFollowUpAtStr)
            ) {
              onSetGateClientId(null);
            }
          }}
        />
      </ReportFieldTooltip>
    </TableCell>
    <TableCell>
      <ReportFieldTooltip
        tooltip={fullCellTooltip(
          displayRow.managementRecommendationText
        )}
      >
        <Textarea
          rows={2}
          className={reportBTextarea}
          disabled={isSaving}
          value={displayRow.managementRecommendationText ?? ""}
          onChange={(e) =>
            patchFieldDebounced({
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
          disabled={isSaving}
          value={mgmtDateStr}
          onChange={(e) =>
            patchFieldDebounced({
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
        tooltip={fullCellTooltip(displayRow.company)}
      >
        <Textarea
          rows={2}
          className={reportBTextarea}
          disabled={isSaving}
          value={displayRow.company ?? ""}
          onChange={(e) =>
            patchFieldDebounced({ company: e.target.value })
          }
        />
      </ReportFieldTooltip>
    </TableCell>
    <TableCell dir="ltr" className="text-muted-foreground">
      {days === null ? "—" : `${days} D`}
    </TableCell>
    <TableCell dir="ltr" className="text-muted-foreground">
      {displayRow.initialCallDate
        ? formatDateArabicLong(new Date(displayRow.initialCallDate))
        : "—"}
    </TableCell>
    <TableCell>
      <ReportFieldTooltip tooltip={fullCellTooltip(displayRow.name)}>
        <Textarea
          rows={2}
          className={reportBTextarea}
          disabled={isSaving}
          value={displayRow.name}
          onChange={(e) =>
            patchFieldDebounced({ name: e.target.value })
          }
        />
      </ReportFieldTooltip>
    </TableCell>
    <TableCell>
      <ReportFieldTooltip
        tooltip={fullCellTooltip(displayRow.activity)}
      >
        <Textarea
          rows={2}
          className={reportBTextarea}
          disabled={isSaving}
          value={displayRow.activity ?? ""}
          onChange={(e) =>
            patchFieldDebounced({ activity: e.target.value })
          }
        />
      </ReportFieldTooltip>
    </TableCell>
    <TableCell>
      <ReportFieldTooltip
        tooltip={fullCellTooltip(displayRow.position)}
      >
        <Textarea
          rows={2}
          className={reportBTextarea}
          disabled={isSaving}
          value={displayRow.position ?? ""}
          onChange={(e) =>
            patchFieldDebounced({ position: e.target.value })
          }
        />
      </ReportFieldTooltip>
    </TableCell>
    <TableCell>
      <ReportFieldTooltip
        tooltip={fullCellTooltip(displayRow.address)}
      >
        <Textarea
          rows={2}
          className={cn(reportBTextarea, "min-w-[12rem]")}
          value={displayRow.address ?? ""}
          disabled={isSaving}
          onChange={(e) =>
            patchFieldDebounced({ address: e.target.value })
          }
        />
      </ReportFieldTooltip>
    </TableCell>
    <TableCell dir="ltr">
      <ReportFieldTooltip
        tooltip={fullCellTooltip(
          [displayRow.phone, displayRow.phone2].filter(Boolean).join(" / ")
        )}
      >
        <Textarea
          rows={2}
          className={cn(
            reportBTextarea,
            "min-w-[11rem] text-left"
          )}
          value={[displayRow.phone, displayRow.phone2]
            .filter(Boolean)
            .join(" / ")}
          disabled={isSaving}
          onChange={(e) => {
            const parts = e.target.value.split(/\s*\/\s*/);
            patchFieldDebounced({
              phone: parts[0]?.trim() ?? "",
              phone2: parts[1]?.trim() || null,
            });
          }}
        />
      </ReportFieldTooltip>
    </TableCell>
    <TableCell dir="ltr">
      <ReportFieldTooltip
        tooltip={fullCellTooltip(displayRow.quotePrice)}
      >
        <Textarea
          rows={2}
          className={cn(
            reportBTextarea,
            "min-w-[6rem] text-left tabular-nums"
          )}
          value={displayRow.quotePrice ?? ""}
          disabled={isSaving}
          onChange={(e) =>
            patchFieldDebounced({ quotePrice: e.target.value })
          }
        />
      </ReportFieldTooltip>
    </TableCell>
    <TableCell>
      <ReportFieldTooltip
        tooltip={fullCellTooltip(displayRow.quoteDetail)}
      >
        <Textarea
          rows={2}
          className={reportBTextarea}
          disabled={isSaving}
          value={displayRow.quoteDetail ?? ""}
          onChange={(e) =>
            patchFieldDebounced({ quoteDetail: e.target.value })
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
          disabled={isSaving}
          value={combinedNote}
          onChange={(e) => {
            const sp = splitCallAndSituation(e.target.value);
            patchFieldDebounced({
              callSummary: sp.callSummary,
              currentSituation: sp.currentSituation,
            });
          }}
        />
      </ReportFieldTooltip>
    </TableCell>
    <TableCell>
      <ReportFieldTooltip
        tooltip={fullCellTooltip(displayRow.salesNotes)}
      >
        <Textarea
          rows={2}
          className={reportBTextarea}
          disabled={isSaving}
          value={displayRow.salesNotes ?? ""}
          onChange={(e) =>
            patchFieldDebounced({ salesNotes: e.target.value })
          }
        />
      </ReportFieldTooltip>
    </TableCell>
    <TableCell>
      <ReportFieldTooltip tooltip={classificationTooltip}>
      <Select
        value={displayRow.classificationId ?? "__none__"}
        onValueChange={(v) => {
          const id = v === "__none__" ? null : v;
          const opt = classifications.find((c) => c.id === v);
          patchFieldImmediate({
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
                displayRow.classificationLabel ?? String(v)
              );
              const col =
                displayRow.classificationColor ?? "#94a3b8";
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
              displayRow.classificationId &&
              !base.some((c) => c.id === displayRow.classificationId)
                ? classifications.find(
                    (c) => c.id === displayRow.classificationId
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
        tooltip={fullCellTooltip(displayRow.adPlatform)}
      >
        <Textarea
          rows={2}
          className={reportBTextarea}
          disabled={isSaving}
          value={displayRow.adPlatform ?? ""}
          onChange={(e) =>
            patchFieldDebounced({ adPlatform: e.target.value })
          }
        />
      </ReportFieldTooltip>
    </TableCell>
    <TableCell>
      <ReportFieldTooltip
        tooltip={fullCellTooltip(displayRow.sourceAdName)}
      >
        <Textarea
          rows={2}
          className={reportBTextarea}
          disabled={isSaving}
          value={displayRow.sourceAdName ?? ""}
          onChange={(e) =>
            patchFieldDebounced({ sourceAdName: e.target.value })
          }
        />
      </ReportFieldTooltip>
    </TableCell>
    <TableCell>
      <ReportFieldTooltip
        tooltip={
          displayRow.visitAppointmentScheduled
            ? "زيارة مجدولة: نعم"
            : "زيارة مجدولة: لا"
        }
      >
        <span className="inline-flex items-center">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={displayRow.visitAppointmentScheduled}
            disabled={isSaving}
            onChange={(e) =>
              patchFieldImmediate({
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
          isoToDateInput(displayRow.visitAppointmentDate)
        )}
      >
        <Input
          type="date"
          dir="ltr"
          className={cn(reportBInput, "text-left")}
          disabled={isSaving}
          value={isoToDateInput(displayRow.visitAppointmentDate)}
          onChange={(e) =>
            patchFieldDebounced({
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
        tooltip={fullCellTooltip(displayRow.presentingEmployeeName)}
      >
        <Textarea
          rows={2}
          className={reportBTextarea}
          disabled={isSaving}
          value={displayRow.presentingEmployeeName ?? ""}
          onChange={(e) =>
            patchFieldDebounced({
              presentingEmployeeName: e.target.value,
            })
          }
        />
      </ReportFieldTooltip>
    </TableCell>
    <TableCell>
      <ReportFieldTooltip
        tooltip={fullCellTooltip(
          displayRow.qqAnswer === null
            ? ""
            : displayRow.qqAnswer
              ? "نعم"
              : "لا"
        )}
      >
        <Select
          value={
            displayRow.qqAnswer === null
              ? "__none__"
              : displayRow.qqAnswer
                ? "yes"
                : "no"
          }
          onValueChange={(v) =>
            patchFieldImmediate({
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
        tooltip={fullCellTooltip(displayRow.finalStatusNote)}
      >
        <Textarea
          rows={2}
          className={reportBTextarea}
          disabled={isSaving}
          value={displayRow.finalStatusNote ?? ""}
          onChange={(e) =>
            patchFieldDebounced({
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
                disabled={isSaving}
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
                  patchFieldDebounced({
                    followUpSlots: followSlotsToJson(next),
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
                disabled={isSaving}
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
                  patchFieldDebounced({
                    followUpSlots: followSlotsToJson(next),
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

}

function rowPropsEqual(
  a: ReportBTableBodyRowProps,
  b: ReportBTableBodyRowProps
): boolean {
  return (
    a.r === b.r &&
    a.isGateClientRow === b.isGateClientRow &&
    a.isFocused === b.isFocused &&
    a.isSaving === b.isSaving &&
    a.savingInProgress === b.savingInProgress &&
    a.gateBlockActive === b.gateBlockActive &&
    a.isReopening === b.isReopening &&
    a.panelView === b.panelView &&
    a.localEntry === b.localEntry &&
    a.maxFollowCols === b.maxFollowCols &&
    a.dashboardMode === b.dashboardMode &&
    a.toolbar === b.toolbar &&
    a.classifications === b.classifications &&
    a.tableClassificationOptions === b.tableClassificationOptions &&
    a.notBClassifications === b.notBClassifications &&
    a.resolvedAuditReportKey === b.resolvedAuditReportKey &&
    a.onField === b.onField &&
    a.onSaveRow === b.onSaveRow &&
    a.onSetFocusedRowId === b.onSetFocusedRowId &&
    a.onSetGateDialogOpen === b.onSetGateDialogOpen &&
    a.onSetHiddenIds === b.onSetHiddenIds &&
    a.onSetPanel === b.onSetPanel &&
    a.onSetReopeningClientId === b.onSetReopeningClientId &&
    a.onSetGateClientId === b.onSetGateClientId &&
    a.scrollReportBHorizontal === b.scrollReportBHorizontal &&
    a.scrollReportBToScrollEdge === b.scrollReportBToScrollEdge &&
    a.router === b.router &&
    a.wonSaleColumns === b.wonSaleColumns
  );
}

export const ReportBTableBodyRow = memo(ReportBTableBodyRowInner, rowPropsEqual);
