import { NextResponse } from "next/server";
import { ClientStatus } from "@prisma/client";
import * as XLSX from "xlsx";

import { getSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

function cellStr(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  const dbUserId = await resolveSessionDbUserId(session);
  if (!dbUserId) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ message: "لم يُرفع ملف." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let workbook: XLSX.WorkBook;
  try {
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

  const classification = await prisma.clientClassification.findFirst({
    where: { isBRow: true },
    orderBy: { sortOrder: "asc" },
  });

  if (!classification) {
    return NextResponse.json(
      { message: "لا يوجد تصنيف B في النظام." },
      { status: 400 }
    );
  }

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = cellStr(row, [
      "اسم_العميل",
      "اسم العميل",
      "الاسم",
      "name",
      "Name",
    ]);
    const phone = cellStr(row, ["الهاتف", "هاتف", "phone", "Phone"]);
    if (!name || !phone) {
      if (name || phone) {
        errors.push(`صف ${i + 2}: اسم أو هاتف ناقص`);
      }
      continue;
    }

    const company = cellStr(row, ["الشركة", "شركة", "company"]);
    const position = cellStr(row, ["المسمى_الوظيفي", "المسمى الوظيفي", "position"]) || "—";
    const address = cellStr(row, ["العنوان", "address"]) || "—";

    try {
      await prisma.client.create({
        data: {
          name,
          phone,
          company: company || null,
          position,
          address,
          quoteDetail: "—",
          callSummary: "",
          salesNotes: "",
          clientWarmingText: "",
          status: ClientStatus.B,
          classificationId: classification.id,
          assignedUserId: dbUserId,
          nextFollowUpAt: nextWeek,
          initialCallDate: new Date(),
          qqAnswer: false,
          visitAppointmentScheduled: false,
          followUpSlots: [],
          customFields: {},
          adPlatform: "استيراد Excel",
          sourceAdName: "استيراد",
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: dbUserId,
          entity: "Client",
          kind: "IMPORT_ROW",
          action: "CLIENT_IMPORT",
          summary: `استيراد عميل: ${name}`,
        },
      });
      created++;
    } catch (e) {
      console.error(e);
      errors.push(`صف ${i + 2}: فشل الحفظ`);
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    skipped: rows.length - created,
    errors: errors.slice(0, 20),
  });
}
