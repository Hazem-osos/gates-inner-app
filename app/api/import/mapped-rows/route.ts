import { NextResponse } from "next/server";

import { getSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import type { UserRole } from "@prisma/client";

import { processReportImportRows } from "@/lib/import/process-report-import-rows";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  const dbUserId = await resolveSessionDbUserId(session);
  if (!dbUserId) {
    return NextResponse.json(
      { message: "تعذر ربط حسابك بقاعدة البيانات." },
      { status: 401 }
    );
  }

  let body: { kind?: string; rows?: Record<string, unknown>[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const kind = String(body.kind ?? "report-b").trim();
  const rows = Array.isArray(body.rows) ? body.rows : [];

  if (rows.length === 0) {
    return NextResponse.json({ message: "لا توجد صفوف للاستيراد." }, { status: 400 });
  }
  if (rows.length > 5000) {
    return NextResponse.json(
      { message: "عدد الصفوف كبير جداً (الحد 5000)." },
      { status: 400 }
    );
  }

  const out = await processReportImportRows(rows, {
    kind,
    sessionRole: session.role as UserRole,
    dbUserId,
  });

  return NextResponse.json({
    ok: true,
    updated: out.updated,
    processed: out.processed,
    errors: out.errors,
  });
}
