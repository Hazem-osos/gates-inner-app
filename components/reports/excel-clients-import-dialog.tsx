"use client";

import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import {
  cellStr,
  countImportableRows,
  previewDataRows,
  resolveColumnMap,
  type ImportType,
} from "@/lib/import/excel-client-import";
import { cn } from "@/lib/utils";

type ImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
  duplicates: { name: string; phone: string }[];
};

type Props = {
  importType: ImportType;
  className?: string;
};

export function ExcelClientsImportDialog({ importType, className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<unknown[][]>([]);
  const [importableCount, setImportableCount] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const resetFileState = useCallback(() => {
    setFile(null);
    setHeaders([]);
    setPreviewRows([]);
    setImportableCount(0);
    setParseError(null);
    setResult(null);
  }, []);

  const processBuffer = useCallback((buf: ArrayBuffer, f: File) => {
    setFile(f);
    setResult(null);
    setParseError(null);
    try {
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sn = wb.SheetNames[0];
      if (!sn) {
        setParseError("الملف لا يحتوي ورقة بيانات.");
        return;
      }
      const sheet = wb.Sheets[sn];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        blankrows: false,
      });
      if (!aoa.length) {
        setParseError("الورقة فارغة.");
        return;
      }
      const map = resolveColumnMap(aoa);
      const headerRow = (aoa[0] ?? []).map((c) => cellStr(c));
      setHeaders(headerRow);
      setPreviewRows(previewDataRows(aoa, map, 5));
      setImportableCount(countImportableRows(aoa, map));
    } catch {
      setParseError("تعذر قراءة الملف.");
    }
  }, []);

  const onPickFile = useCallback(
    (f: File | null) => {
      if (!f) return;
      const lower = f.name.toLowerCase();
      if (!lower.endsWith(".xlsx")) {
        setParseError("يُقبل ملف .xlsx فقط.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          processBuffer(reader.result, f);
        }
      };
      reader.readAsArrayBuffer(f);
    },
    [processBuffer]
  );

  const onImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("importType", importType);
      const r = await fetch("/api/import/clients", {
        method: "POST",
        body: fd,
      });
      const j = (await r.json()) as ImportResult & {
        message?: string;
        ok?: boolean;
      };
      if (!r.ok) throw new Error(j.message ?? "فشل الاستيراد");
      setResult({
        imported: j.imported ?? 0,
        skipped: j.skipped ?? 0,
        errors: j.errors ?? [],
        duplicates: j.duplicates ?? [],
      });
      router.refresh();
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "فشل الاستيراد");
    } finally {
      setLoading(false);
    }
  };

  const previewCols = Math.min(
    12,
    Math.max(headers.length, ...previewRows.map((r) => r.length), 1)
  );

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          resetFileState();
          setOpen(true);
        }}
        className={cn(
          "border-0 bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700",
          className
        )}
      >
        استيراد من Excel
      </Button>

      <SimpleDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetFileState();
        }}
        title="استيراد عملاء من Excel"
        contentClassName="max-w-4xl"
        closeOnBackdrop={!loading}
        closeOnEscape={!loading}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={!file || loading || importableCount === 0}
              onClick={() => void onImport()}
            >
              {loading ? "جاري الاستيراد…" : "بدء الاستيراد"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            اسحب ملف <strong>.xlsx</strong> هنا أو اختره من جهازك. الصف الأول
            يُفترض أنه عناوين الأعمدة.
          </p>

          <div
            className={cn(
              "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
              dragOver ? "border-emerald-500 bg-emerald-500/5" : "border-border"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              onPickFile(f ?? null);
            }}
          >
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              id={`excel-import-${importType}`}
              disabled={loading}
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <label
              htmlFor={`excel-import-${importType}`}
              className="cursor-pointer text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              اختر ملفاً
            </label>
            {file ? (
              <p className="mt-2 text-xs text-muted-foreground">{file.name}</p>
            ) : null}
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-full animate-pulse bg-emerald-600" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                جاري رفع الملف ومعالجة الصفوف…
              </p>
            </div>
          ) : null}

          {parseError ? (
            <p className="text-sm text-destructive" dir="rtl">
              {parseError}
            </p>
          ) : null}

          {file && !parseError && headers.length > 0 ? (
            <>
              <p className="font-medium" dir="rtl">
                سيتم استيراد {importableCount} عميلاً من الملف
              </p>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[480px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {Array.from({ length: previewCols }, (_, i) => (
                        <th
                          key={i}
                          className="border border-border/60 px-1 py-1 text-right font-medium"
                        >
                          {headers[i] ?? `—`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri}>
                        {Array.from({ length: previewCols }, (_, ci) => (
                          <td
                            key={ci}
                            className="border border-border/40 px-1 py-1 text-right"
                          >
                            {cellStr(row[ci])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {result ? (
            <div className="space-y-3 rounded-lg border border-emerald-600/30 bg-emerald-500/5 p-3 text-sm" dir="rtl">
              <p className="font-medium text-emerald-800 dark:text-emerald-200">
                تم استيراد {result.imported} عميلاً بنجاح، وتم تجاهل{" "}
                {result.skipped} (مكررون في قاعدة البيانات).
              </p>
              {result.duplicates.length > 0 ? (
                <div>
                  <p className="mb-1 font-medium">مكررون:</p>
                  <ul className="max-h-28 list-inside list-disc overflow-y-auto text-xs">
                    {result.duplicates.slice(0, 30).map((d, i) => (
                      <li key={i}>
                        {d.name} — {d.phone}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result.errors.length > 0 ? (
                <div>
                  <p className="mb-1 font-medium text-destructive">أخطاء:</p>
                  <ul className="max-h-36 list-inside list-decimal overflow-y-auto text-xs">
                    {result.errors.slice(0, 40).map((e, i) => (
                      <li key={i}>
                        صف {e.row}: {e.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </SimpleDialog>
    </>
  );
}
