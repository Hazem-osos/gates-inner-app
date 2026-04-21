import { NextResponse } from "next/server";

import { buildExportPayload } from "@/lib/export/build-export-data";
import { getSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const dbUserId = await resolveSessionDbUserId(session);
  if (!dbUserId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") ?? "report-b";

  try {
    const payload = await buildExportPayload(kind, searchParams, {
      id: dbUserId,
      role: session.role,
    });

    const tableHtml = payload.sheets
      .map((sheet) => {
        const rows = sheet.rows.length ? sheet.rows : [{ رسالة: "لا بيانات" }];
        const keys = Object.keys(rows[0] ?? {});
        const thead =
          `<thead><tr>${keys.map((k) => `<th>${escapeHtml(k)}</th>`).join("")}</tr></thead>`;
        const tbody = rows
          .map(
            (row) =>
              `<tr>${keys.map((k) => `<td>${escapeHtml(row[k] ?? "")}</td>`).join("")}</tr>`
          )
          .join("");
        /** جدول بـ LTR ليطابق ترتيب أعمدة Excel؛ المحتوى العربي بمحاذاة يمين. */
        return `<section class="sheet-block"><h2>${escapeHtml(sheet.sheetName)}</h2><table class="export-grid" lang="ar">${thead}<tbody>${tbody}</tbody></table></section>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(payload.documentTitle)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0; padding: 1rem 1.25rem; color: #18181b; background: #fafafa; }
    h1 { font-size: 1.35rem; margin: 0 0 1rem; font-weight: 600; color: #18181b; }
    h2 { font-size: 1rem; margin: 1.25rem 0 0.5rem; color: #3f3f46; }
    .toolbar { margin-bottom: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    button {
      font: inherit; cursor: pointer; padding: 0.5rem 1rem; border-radius: 0.5rem;
      border: 1px solid #d4d4d8; background: #fff; color: #18181b; box-shadow: 0 1px 2px rgba(0,0,0,.05);
    }
    button:hover { background: #f4f4f5; }
    table.export-grid {
      border-collapse: collapse; width: 100%; font-size: 11px; background: #fff;
      border: 1px solid #e4e4e7; border-radius: 0.5rem; overflow: hidden;
      direction: ltr;
      unicode-bidi: isolate;
    }
    th, td {
      border: 1px solid #e4e4e7; padding: 6px 8px;
      text-align: right;
      vertical-align: top;
      word-break: break-word;
    }
    th { background: #f4f4f5; font-weight: 600; color: #27272a; }
    .sheet-block { margin-bottom: 1.5rem; }
    .hint { font-size: 12px; color: #71717a; margin-top: 0.25rem; }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar, .hint { display: none !important; }
      table { font-size: 10px; }
      button { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">طباعة / حفظ PDF</button>
    <a href="/dashboard" style="font-size:14px;color:#2563eb;">← لوحة التحكم</a>
  </div>
  <h1>${escapeHtml(payload.documentTitle)}</h1>
  <p class="hint">استخدم «طباعة» في المتصفح ثم اختر «حفظ كـ PDF» إن أردت ملفاً.</p>
  ${tableHtml}
  <script>document.title = ${JSON.stringify(payload.documentTitle)};</script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="export.html"`,
      },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse(
      `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/></head><body><p>تعذر إنشاء المعاينة.</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
