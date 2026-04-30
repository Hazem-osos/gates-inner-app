"use client";

import { Database, Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/simple-dialog";

function parseFilenameFromDisposition(cd: string | null): string | null {
  if (!cd) return null;
  const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(cd);
  return m?.[1]?.trim() ? decodeURIComponent(m[1].trim()) : null;
}

export function BackupManager() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function downloadBackup() {
    setDownloading(true);
    try {
      const r = await fetch("/api/backup/export", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message ?? "فشل إنشاء النسخة الاحتياطية.");
      }
      const ct = r.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const j = (await r.json()) as { message?: string };
        throw new Error(j.message ?? "فشل إنشاء النسخة الاحتياطية.");
      }
      const blob = await r.blob();
      const cd = r.headers.get("Content-Disposition");
      const name =
        parseFilenameFromDisposition(cd) ??
        `backup-${new Date().toISOString().slice(0, 10)}.sql`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل ملف النسخة الاحتياطية.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل التنزيل.");
    } finally {
      setDownloading(false);
    }
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".sql")) {
      toast.error("يُقبل ملف .sql فقط.");
      return;
    }
    setPendingFile(f);
    setConfirmOpen(true);
  }

  async function runRestore() {
    if (!pendingFile) return;
    setRestoring(true);
    setConfirmOpen(false);
    try {
      const fd = new FormData();
      fd.set("file", pendingFile);
      const r = await fetch("/api/backup/import", {
        method: "POST",
        credentials: "same-origin",
        body: fd,
      });
      const j = (await r.json().catch(() => ({}))) as {
        message?: string;
        ok?: boolean;
      };
      if (!r.ok) {
        throw new Error(j.message ?? "فشل الاسترجاع.");
      }
      toast.success(j.message ?? "تم استرجاع القاعدة بنجاح.");
      setPendingFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الاسترجاع.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="space-y-6 rounded-xl border border-border/80 bg-card p-6 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Database className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            النسخ الاحتياطي واسترجاع MySQL
          </h2>
          <p className="text-sm text-muted-foreground">
            يستخدم الخادم أوامر <code className="rounded bg-muted px-1">mysqldump</code> و{" "}
            <code className="rounded bg-muted px-1">mysql</code>. يجب تثبيت أدوات عميل
            MySQL على الجهاز الذي يشغّل التطبيق.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Download className="size-4" aria-hidden />
            تنزيل نسخة احتياطية
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            تصدير قاعدة البيانات الحالية إلى ملف SQL يمكن حفظه خارج الخادم.
            للاتصال بـ MySQL على الإنترنت (مثل Aiven) يُضاف{" "}
            <code className="rounded bg-muted px-1">ssl-mode=REQUIRED</code> تلقائياً
            عبر ملف الإعدادات. محلياً على{" "}
            <code className="rounded bg-muted px-1">localhost</code> لا يُفرض TLS.
            يُمرَّر{" "}
            <code className="rounded bg-muted px-1">--set-gtid-purged=OFF</code>{" "}
            لتفادي تحذيرات GTID عند الاستيراد لاحقاً خارج نفس طوبولوجيا النسخ
            المتماثل.
          </p>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            إذا ظهر خطأ يذكر{" "}
            <code className="rounded bg-muted px-1">LIBRARIES</code> في{" "}
            <code className="rounded bg-muted px-1">information_schema</code>،
            فعادةً سببه أن أداة{" "}
            <code className="rounded bg-muted px-1">mysqldump</code> من إصدار 9
            أو أحدث تُشغَّل ضد خادم MySQL 8 (مثل قواعد DigitalOcean). ثبّت عميل
            MySQL 8.x ووجّه المتغير{" "}
            <code className="rounded bg-muted px-1">MYSQLDUMP_PATH</code> في بيئة
            التشغيل إلى مسار <code className="rounded bg-muted px-1">mysqldump</code>{" "}
            الخاص به، أو استخدم نفس إصدار العميل تقريباً كإصدار الخادم.
          </p>
          <Button
            type="button"
            disabled={downloading}
            onClick={() => void downloadBackup()}
          >
            {downloading ? "جاري التجهيز…" : "تنزيل نسخة احتياطية"}
          </Button>
        </div>

        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
            <Upload className="size-4" aria-hidden />
            استرجاع نسخة احتياطية
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            رفع ملف SQL يُنفَّذ على نفس قاعدة البيانات المعرّفة في{" "}
            <code className="rounded bg-muted px-1">DATABASE_URL</code>. قد يُستبدل
            المحتوى الحالي (جداول/بيانات) حسب محتوى الملف. يتطلب أداة{" "}
            <code className="rounded bg-muted px-1">mysql</code> متاحة (PATH) أو عيّن{" "}
            <code className="rounded bg-muted px-1">MYSQL_PATH</code>.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".sql,application/sql,text/plain"
            className="sr-only"
            onChange={onFileChosen}
          />
          <Button
            type="button"
            variant="destructive"
            disabled={restoring}
            onClick={() => fileRef.current?.click()}
          >
            {restoring ? "جاري الاسترجاع…" : "اختيار ملف واسترجاع"}
          </Button>
        </div>
      </div>

      <SimpleDialog
        open={confirmOpen}
        onOpenChange={(v) => {
          setConfirmOpen(v);
          if (!v) setPendingFile(null);
        }}
        title="تأكيد استرجاع قاعدة البيانات"
        closeOnBackdrop={!restoring}
        closeOnEscape={!restoring}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={restoring}
              onClick={() => {
                setConfirmOpen(false);
                setPendingFile(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={restoring}
              onClick={() => void runRestore()}
            >
              نعم، نفّذ الاسترجاع
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm leading-relaxed">
          <p className="font-semibold text-destructive">
            تحذير: هذه العملية خطيرة ولا يمكن التراجع عنها تلقائياً.
          </p>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>سيتم تنفيذ أوامر SQL من الملف على قاعدة البيانات الحالية.</li>
            <li>قد تُحذف أو تُستبدل جداول وبيانات موجودة.</li>
            <li>يُفضّل أخذ نسخة احتياطية حالية قبل المتابعة.</li>
          </ul>
          {pendingFile ? (
            <p className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs">
              الملف: <span className="font-medium">{pendingFile.name}</span> (
              {(pendingFile.size / (1024 * 1024)).toFixed(2)} ميجابايت)
            </p>
          ) : null}
        </div>
      </SimpleDialog>
    </div>
  );
}
