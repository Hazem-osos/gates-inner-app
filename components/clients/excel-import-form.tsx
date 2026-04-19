"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { clientsImportTemplateHref } from "@/lib/export-excel-href";

export function ExcelImportForm() {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    if (!file || !(file instanceof File) || file.size === 0) {
      setMsg("اختر ملفاً صالحاً.");
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/import/clients-xlsx", {
        method: "POST",
        body: fd,
      });
      const j = (await r.json()) as {
        message?: string;
        created?: number;
        errors?: string[];
      };
      if (!r.ok) throw new Error(j.message ?? "فشل الاستيراد");
      const parts = [
        `تم إنشاء ${j.created ?? 0} عميل.`,
        ...(j.errors?.length ? [`ملاحظات: ${j.errors.slice(0, 5).join(" — ")}`] : []),
      ];
      setMsg(parts.join(" "));
      e.currentTarget.reset();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "فشل الاستيراد");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-lg space-y-4 rounded-xl border border-border/70 bg-card p-6 shadow-sm"
    >
      <p className="text-sm text-muted-foreground">
        استخدم الأعمدة: اسم العميل، الهاتف، (اختياري) الشركة، المسمى الوظيفي،
        العنوان. يُنشأ كل صف كعميل B ويُسند إليك.
      </p>
      <p>
        <Link
          href={clientsImportTemplateHref()}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          تنزيل قالب Excel
        </Link>
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium">ملف .xlsx</label>
        <input
          type="file"
          name="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          className="block w-full text-sm"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "جاري الرفع…" : "رفع واستيراد"}
      </Button>
      {msg ? (
        <p className="text-sm text-foreground" dir="rtl">
          {msg}
        </p>
      ) : null}
    </form>
  );
}
