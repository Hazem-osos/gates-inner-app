import { NextResponse } from "next/server";
import { ClientStatus } from "@prisma/client";
import * as XLSX from "xlsx";

import { getSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { normalizedImportNameAndCompany } from "@/lib/import/client-name-company-normalize";
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
    const phone = cellStr(row, ["الهاتف", "هاتف", "phone", "Phone"]);
    const contactExplicit = cellStr(row, [
      "اسم المسؤول",
      "اسم المسئول",
      "المسؤول",
      "مسؤول",
      "contact",
      "Contact",
    ]);
    const companyRaw = cellStr(row, [
      "الشركة",
      "شركة",
      "company",
      "Company",
      "اسم_الشركة",
      "اسم الشركة",
    ]);
    const genericLabel = cellStr(row, [
      "اسم_العميل",
      "اسم العميل",
      "الاسم",
      "name",
      "Name",
    ]);

    const hasIdentity =
      contactExplicit.trim() ||
      genericLabel.trim() ||
      companyRaw.trim();

    if (!phone || !hasIdentity) {
      if (phone || hasIdentity) {
        errors.push(`صف ${i + 2}: هاتف ناقص أو لا يوجد اسم/شركة`);
      }
      continue;
    }

    const { name, company } = normalizedImportNameAndCompany({
      contactPerson: contactExplicit || genericLabel,
      companyName: companyRaw,
      phoneFallbackSuffix: phone.slice(-4),
    });
    const position = cellStr(row, ["المسمى_الوظيفي", "المسمى الوظيفي", "position"]) || "—";
    const address = cellStr(row, ["العنوان", "address"]) || "—";

    try {
      await prisma.client.create({
        data: {
          name,
          phone,
          company,
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
