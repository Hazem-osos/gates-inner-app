import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { getSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import type { UserRole } from "@prisma/client";

import { processReportImportRows } from "@/lib/import/process-report-import-rows";

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

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") ?? "report-b";

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ message: "لم يُرفع ملف." }, { status: 400 });
  }

  let workbook: XLSX.WorkBook;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    workbook = XLSX.read(buf, { type: "buffer" });
  } catch {
    return NextResponse.json({ message: "ملف Excel غير صالح." }, { status: 400 });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ message: "الملف فارغ." }, { status: 400 });
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

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
    results: {
      updated: out.updated,
      processed: out.processed,
      errors: out.errors,
    },
  });
}
