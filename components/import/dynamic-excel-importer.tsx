"use client";

import * as XLSX from "xlsx";
import { Upload } from "lucide-react";
import {
  useCallback,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ExpectedField } from "@/lib/import/expected-field";
import {
  compactNormalized,
  normalizeArabicText,
} from "@/lib/import/normalize-arabic-text";
import { cn } from "@/lib/utils";

const NONE_VALUE = "__none__";

export type { ExpectedField };

export type DynamicExcelImporterProps = {
  expectedFields: ExpectedField[];
  onImport: (
    mappedData: Record<string, unknown>[]
  ) => void | Promise<void>;
  /** عنوان اختياري فوق منطقة الرفع */
  title?: string;
  className?: string;
};

const MIN_PARTIAL_LEN = 3;
/** أدنى طول للمطابقة الجزئية على النص المدمج (بدون مسافات) لتقليل التطابق العرضي. */
const MIN_PARTIAL_LEN_COMPACT = 4;

function humanizeFieldKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

/**
 * Step C: أحد النصين يحتوي الآخر (بعد التطبيع)، مع حد أدنى لطول الأقصر.
 */
function partialContainScore(
  a: string,
  b: string,
  minShort: number
): number {
  if (!a || !b) return 0;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length < minShort) return 0;
  if (!longer.includes(shorter)) return 0;
  return shorter.length * 800 + longer.length;
}

/**
 * تقدير قوة التطابق بين عنوان عمود Excel وحقل متوقع.
 * التسلسل: (A) تطابق تام للتسمية أو المفتاح — (B) تطابق تام لأحد aliases —
 * (C) تطابق جزئي (احتواء) للتسمية / المفتاح / المرادفات، مع نسخة مدمجة للمسافات.
 */
function fieldMatchScore(excelHeader: string, field: ExpectedField): number {
  const h = normalizeArabicText(excelHeader);
  const hc = compactNormalized(excelHeader);
  if (!h && !hc) return 0;

  const labelN = normalizeArabicText(field.label);
  const labelC = compactNormalized(field.label);
  const keySrc = humanizeFieldKey(field.key);
  const keyN = normalizeArabicText(keySrc);
  const keyC = compactNormalized(keySrc);

  let best = 0;

  // Step A — exact label / key (normalized or compact-only)
  if (labelN && h === labelN) {
    best = Math.max(best, 1_000_000 + h.length);
  } else if (labelC && hc === labelC) {
    best = Math.max(best, 985_000 + hc.length);
  }

  if (keyN && h === keyN) {
    best = Math.max(best, 970_000 + h.length);
  } else if (keyC && hc === keyC) {
    best = Math.max(best, 955_000 + hc.length);
  }

  // Step B — alias exact
  for (const rawAlias of field.aliases ?? []) {
    const aN = normalizeArabicText(rawAlias);
    const aC = compactNormalized(rawAlias);
    if (aN && h === aN) {
      best = Math.max(best, 930_000 + h.length);
    } else if (aC && hc === aC) {
      best = Math.max(best, 915_000 + hc.length);
    }
  }

  // Step C — partial (substring) both directions encoded as shorter ⊆ longer
  const spacedCandidates = [labelN, keyN, ...(field.aliases ?? []).map(normalizeArabicText)].filter(
    (s) => s.length > 0
  );
  for (const c of spacedCandidates) {
    const p = partialContainScore(h, c, MIN_PARTIAL_LEN);
    if (p > 0) best = Math.max(best, 400_000 + p);
  }

  const compactCandidates = [labelC, keyC, ...(field.aliases ?? []).map(compactNormalized)].filter(
    (s) => s.length > 0
  );
  for (const c of compactCandidates) {
    const p = partialContainScore(hc, c, MIN_PARTIAL_LEN_COMPACT);
    if (p > 0) best = Math.max(best, 360_000 + p);
  }

  return best;
}

/**
 * يطابق كل حقل نظام بأفضل عمود Excel غير مستخدم بعد (لتقليل التداخل التلقائي).
 * يمكن للمستخدم لاحقاً تعيين نفس عمود Excel لأكثر من حقل يدوياً.
 */
function autoMapHeaders(
  headers: string[],
  fields: ExpectedField[]
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();

  const sorted = [...fields].sort((a, b) => {
    const rq = Number(!!b.required) - Number(!!a.required);
    if (rq !== 0) return rq;
    return a.key.localeCompare(b.key);
  });

  for (const field of sorted) {
    let best: { header: string; score: number } | null = null;
    for (const header of headers) {
      if (!header || used.has(header)) continue;
      const sc = fieldMatchScore(header, field);
      if (
        sc > 0 &&
        (!best ||
          sc > best.score ||
          (sc === best.score && header.length > best.header.length))
      ) {
        best = { header, score: sc };
      }
    }
    if (best) {
      mapping[field.key] = best.header;
      used.add(best.header);
    } else {
      mapping[field.key] = "";
    }
  }

  return mapping;
}

function parseWorkbookFirstSheet(file: ArrayBuffer): {
  headers: string[];
  matrix: unknown[][];
  error?: string;
} {
  try {
    const workbook = XLSX.read(file, { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { headers: [], matrix: [], error: "الملف لا يحتوي على أي ورقة." };
    }
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });
    if (!matrix.length) {
      return { headers: [], matrix: [], error: "الورقة الأولى فارغة." };
    }
    const headerRow = matrix[0] ?? [];
    const usedNames = new Map<string, number>();
    const headers = headerRow.map((cell, i) => {
      let base = String(cell ?? "").trim() || `عمود_${i + 1}`;
      const n = usedNames.get(base) ?? 0;
      usedNames.set(base, n + 1);
      if (n > 0) base = `${base} (${n + 1})`;
      return base;
    });
    const body = matrix.slice(1).filter((row) =>
      Array.isArray(row)
        ? row.some((c) => String(c ?? "").trim() !== "")
        : false
    );
    return { headers, matrix: [headerRow, ...body] };
  } catch {
    return {
      headers: [],
      matrix: [],
      error: "تعذر قراءة الملف. تأكد أنه Excel أو CSV صالح.",
    };
  }
}

function cellAt(matrixRow: unknown[] | undefined, colIndex: number): unknown {
  if (!matrixRow || colIndex < 0) return "";
  return matrixRow[colIndex] ?? "";
}

export function DynamicExcelImporter({
  expectedFields,
  onImport,
  title = "استيراد من Excel",
  className,
}: DynamicExcelImporterProps) {
  const fileInputId = useId();
  const [parseError, setParseError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  /** صفوف البيانات فقط (بدون صف العناوين) */
  const [dataRows, setDataRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const headerIndex = useMemo(() => {
    const m = new Map<string, number>();
    headers.forEach((h, i) => {
      if (!m.has(h)) m.set(h, i);
    });
    return m;
  }, [headers]);

  const validationError = useMemo(() => {
    const missing = expectedFields.filter(
      (f) => f.required && !(mapping[f.key] && mapping[f.key].trim())
    );
    if (missing.length === 0) return null;
    return `يرجى ربط الحقول المطلوبة: ${missing.map((m) => m.label).join("، ")}`;
  }, [expectedFields, mapping]);

  const applyFile = useCallback(
    (file: File) => {
      setParseError(null);
      setFileLabel(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const buf = reader.result;
        if (!(buf instanceof ArrayBuffer)) {
          setParseError("تعذر قراءة الملف.");
          return;
        }
        const { headers: h, matrix, error } = parseWorkbookFirstSheet(buf);
        if (error || !h.length) {
          setHeaders([]);
          setDataRows([]);
          setMapping({});
          setParseError(error ?? "لم يُعثر على صف عناوين.");
          return;
        }
        const body = matrix.slice(1) as unknown[][];
        setHeaders(h);
        setDataRows(body);
        setMapping(autoMapHeaders(h, expectedFields));
      };
      reader.onerror = () => setParseError("فشل تحميل الملف.");
      reader.readAsArrayBuffer(file);
    },
    [expectedFields]
  );

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) applyFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyFile(f);
  };

  const buildMappedRow = useCallback(
    (row: unknown[]): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      for (const f of expectedFields) {
        const excelHeader = mapping[f.key]?.trim();
        if (!excelHeader) {
          out[f.key] = "";
          continue;
        }
        const idx = headerIndex.get(excelHeader);
        out[f.key] = idx !== undefined ? cellAt(row, idx) : "";
      }
      return out;
    },
    [expectedFields, mapping, headerIndex]
  );

  const previewRows = useMemo(() => {
    return dataRows.slice(0, 5).map((row) => buildMappedRow(row));
  }, [dataRows, buildMappedRow]);

  const handleSubmit = async () => {
    if (validationError) return;
    const mapped = dataRows.map((row) => buildMappedRow(row));
    setSubmitting(true);
    try {
      await Promise.resolve(onImport(mapped));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setHeaders([]);
    setDataRows([]);
    setMapping({});
    setFileLabel(null);
    setParseError(null);
  };

  return (
    <div
      dir="rtl"
      className={cn(
        "rounded-xl border border-border/80 bg-card p-4 shadow-sm",
        className
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {fileLabel ? (
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            مسح الملف
          </Button>
        ) : null}
      </div>

      <label
        htmlFor={fileInputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <Upload className="size-8 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium text-foreground">
          اسحب ملف Excel أو CSV هنا
        </span>
        <span className="text-xs text-muted-foreground">
          أو اضغط لاختيار ملف (.xlsx, .xls, .csv)
        </span>
        <input
          id={fileInputId}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          className="sr-only"
          onChange={onFileInput}
        />
      </label>

      {fileLabel ? (
        <p className="mt-2 text-xs text-muted-foreground">
          الملف: <span className="font-medium text-foreground">{fileLabel}</span>
        </p>
      ) : null}

      {parseError ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {parseError}
        </p>
      ) : null}

      {headers.length > 0 ? (
        <div className="mt-6 space-y-6">
          <div>
            <p className="mb-3 text-sm font-medium text-foreground">
              ربط الأعمدة
            </p>
            <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
              تم اقتراح تطابق تلقائي يمكنك تعديله من القوائم. لكل حقل يظهر أسفل
              القائمة اسم عمود Excel الفعلي المرتبط به بعد اختيارك.
            </p>
            <div
              className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-foreground"
              role="note"
            >
              <span className="font-semibold text-primary">رقم الهاتف (مطلوب):</span>{" "}
              في الصف الأول من ملفك ابحث عن عنوان عمود يشبه:{" "}
              <span className="font-medium">
                هاتف، جوال، تليفون، تلفون، رقم الهاتف، رقم التليفون، رقم
                الجوال، موبايل، mobile، phone
              </span>{" "}
              ثم اختره من القائمة بجانب «رقم الهاتف».
            </div>
            <div
              className="mb-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-foreground"
              role="note"
            >
              <span className="font-semibold">المتابعات:</span> اربط أعمدة «متابعة
              ١ — نص» و«متابعة ١ — تاريخ» لكل خانة (حتى ٣٠)، أو عمود JSON قديم
              «متابعات (JSON)». تصدير التقرير يولّد نفس الأعمدة تلقائياً. عند
              استيراد عملاء B، إن وُجد عميل بنفس الهاتف بحالة Not B يُحدَّث إلى B
              وتُمسَح حقول التصنيف الفرعي Not B.
            </div>
            <ul className="flex flex-col gap-4">
              {expectedFields.map((field) => {
                const mappedHeader = mapping[field.key]?.trim() ?? "";
                const selectValue = mappedHeader ? mappedHeader : NONE_VALUE;
                return (
                <li
                  key={field.key}
                  className="flex flex-col gap-1.5 rounded-lg border border-border/50 bg-muted/10 p-3 sm:flex-row sm:items-start sm:gap-4"
                >
                  <Label
                    className="min-w-[8rem] shrink-0 text-sm font-medium sm:pt-2"
                    htmlFor={`map-${field.key}`}
                  >
                    {field.label}
                    {field.required ? (
                      <span className="ms-1 text-destructive">*</span>
                    ) : null}
                  </Label>
                  <div className="min-w-0 flex-1 space-y-1.5">
                  <Select
                    value={selectValue}
                    onValueChange={(v: string | null) => {
                      const next = v === NONE_VALUE || !v ? "" : v;
                      setMapping((prev) => ({ ...prev, [field.key]: next }));
                    }}
                  >
                    <SelectTrigger
                      id={`map-${field.key}`}
                      className="h-9 w-full min-w-0 sm:max-w-md"
                      size="sm"
                    >
                      <SelectValue placeholder="اختر عموداً من الملف">
                        {(v: string | null) => {
                          if (v == null || v === "" || v === NONE_VALUE) {
                            return "لا ربط — تجاهل هذا الحقل";
                          }
                          return String(v);
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE} label="لا ربط — تجاهل هذا الحقل">
                        لا ربط — تجاهل هذا الحقل
                      </SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h} label={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p
                    className="text-[11px] leading-snug text-muted-foreground"
                    aria-live="polite"
                  >
                    {mappedHeader ? (
                      <>
                        عمود Excel المرتبط:{" "}
                        <span className="font-semibold text-foreground">
                          «{mappedHeader}»
                        </span>{" "}
                        ← حقل التطبيق:{" "}
                        <span className="font-medium">{field.label}</span>
                      </>
                    ) : (
                      <>
                        لم يُختر عمود من ملف Excel — اختر عنوان العمود من القائمة
                        لربطه بـ «{field.label}».
                      </>
                    )}
                  </p>
                  </div>
                </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              معاينة أول 5 صفوف
            </p>
            <Table containerClassName="max-h-64 rounded-md border border-border/60">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {expectedFields.map((f) => (
                    <TableHead key={f.key} className="whitespace-nowrap text-xs">
                      {f.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={expectedFields.length}
                      className="text-center text-sm text-muted-foreground"
                    >
                      لا توجد صفوف بيانات بعد صف العناوين.
                    </TableCell>
                  </TableRow>
                ) : (
                  previewRows.map((row, ri) => (
                    <TableRow key={ri}>
                      {expectedFields.map((f) => (
                        <TableCell
                          key={f.key}
                          className="max-w-[12rem] truncate text-xs"
                          title={String(row[f.key] ?? "")}
                        >
                          {String(row[f.key] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {validationError ? (
            <p className="text-sm text-destructive" role="status">
              {validationError}
            </p>
          ) : null}

          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={
              Boolean(validationError) ||
              dataRows.length === 0 ||
              submitting
            }
            onClick={() => void handleSubmit()}
          >
            {submitting ? "جاري الاستيراد…" : "تأكيد واستيراد"}
            {dataRows.length > 0 && !submitting ? (
              <span className="me-1 text-xs opacity-90">
                ({dataRows.length} صف)
              </span>
            ) : null}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
