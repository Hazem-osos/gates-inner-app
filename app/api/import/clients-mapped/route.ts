import { NextResponse } from "next/server";

import { getSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import type {
  ImportType,
  ParsedImportRow,
} from "@/lib/import/excel-client-import";
import { rowRecordToParsedImportRow } from "@/lib/import/row-record-to-parsed-import";
import { runClientsParsedImport } from "@/lib/import/run-clients-parsed-import";

export const maxDuration = 120;

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

  let body: { importType?: string; rows?: Record<string, unknown>[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const importTypeRaw = String(body.importType ?? "b").toLowerCase();
  const importType: ImportType = importTypeRaw === "not-b" ? "not-b" : "b";
  const rowsRaw = Array.isArray(body.rows) ? body.rows : [];

  const parsed: ParsedImportRow[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rowsRaw.length; i++) {
    const r = rowRecordToParsedImportRow(rowsRaw[i], i + 2);
    if ("skip" in r) {
      errors.push({ row: r.excelRow, reason: r.reason });
      continue;
    }
    parsed.push(r);
  }

  const result = await runClientsParsedImport({
    importType,
    rows: parsed,
    dbUserId,
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    imported: result.imported,
    skipped: result.skipped,
    errors: [...errors, ...result.errors],
    duplicates: result.duplicates,
  });
}
