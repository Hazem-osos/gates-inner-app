import { NextResponse } from "next/server";
import { ClientStatus, Prisma } from "@prisma/client";

import { getSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import {
  loadSheetAoa,
  parseAllImportRows,
  resolveColumnMap,
  type ImportType,
  type ParsedImportRow,
} from "@/lib/import/excel-client-import";
import { prisma } from "@/lib/prisma";

export const maxDuration = 120;

function parseOptionalDecimal(v: string | null | undefined): Prisma.Decimal | null {
  if (v === undefined || v === null || v === "") return null;
  try {
    return new Prisma.Decimal(v);
  } catch {
    return null;
  }
}

type ClassificationLite = {
  id: string;
  slug: string;
  isBRow: boolean;
  sortOrder: number;
};

function resolveClassificationId(args: {
  importType: ImportType;
  clientTypeRaw: string | null;
  bClass: ClassificationLite | null;
  all: ClassificationLite[];
}): { classificationId: string | null; status: ClientStatus } {
  const { importType, clientTypeRaw, bClass, all } = args;
  const notBFirst =
    all.find((c) => !c.isBRow) ?? all.find((c) => c.id) ?? null;

  const norm = (clientTypeRaw ?? "").trim().toUpperCase();

  const bySlug = (s: string) =>
    all.find((c) => c.slug.toLowerCase() === s.toLowerCase()) ?? null;

  if (importType === "b") {
    if (!norm || norm === "B" || norm === "TB") {
      return {
        classificationId: bClass?.id ?? null,
        status: ClientStatus.B,
      };
    }
    if (norm === "TU") {
      const c = bySlug("u") ?? notBFirst;
      return {
        classificationId: c?.id ?? null,
        status: ClientStatus.NOT_B,
      };
    }
    if (norm === "TC") {
      const c = bySlug("c") ?? notBFirst;
      return {
        classificationId: c?.id ?? null,
        status: ClientStatus.NOT_B,
      };
    }
    if (norm === "TB") {
      return {
        classificationId: bClass?.id ?? null,
        status: ClientStatus.B,
      };
    }
    return {
      classificationId: bClass?.id ?? null,
      status: ClientStatus.B,
    };
  }

  if (norm === "TU") {
    const c = bySlug("u") ?? notBFirst;
    return { classificationId: c?.id ?? null, status: ClientStatus.NOT_B };
  }
  if (norm === "TC") {
    const c = bySlug("c") ?? notBFirst;
    return { classificationId: c?.id ?? null, status: ClientStatus.NOT_B };
  }
  if (norm === "TB" || norm === "B") {
    return {
      classificationId: bClass?.id ?? null,
      status: ClientStatus.B,
    };
  }
  if (!norm) {
    const c = notBFirst;
    return { classificationId: c?.id ?? null, status: ClientStatus.NOT_B };
  }
  const c = notBFirst;
  return { classificationId: c?.id ?? null, status: ClientStatus.NOT_B };
}

function mergeCustomFields(
  daysRaw: string | null
): Prisma.InputJsonValue | undefined {
  if (!daysRaw?.trim()) return undefined;
  const n = Number(daysRaw.replace(/,/g, ""));
  if (Number.isNaN(n)) {
    return { excelImportDaysText: daysRaw } as unknown as Prisma.InputJsonValue;
  }
  return { excelImportDays: n } as unknown as Prisma.InputJsonValue;
}

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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ message: "طلب غير صالح." }, { status: 400 });
  }

  const file = form.get("file");
  const importTypeRaw = String(form.get("importType") ?? "b").toLowerCase();
  const importType: ImportType =
    importTypeRaw === "not-b" ? "not-b" : "b";

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ message: "لم يُرفع ملف." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const aoa = loadSheetAoa(buf);
  if (!aoa) {
    return NextResponse.json(
      { message: "ملف Excel غير صالح أو فارغ." },
      { status: 400 }
    );
  }

  const map = resolveColumnMap(aoa);
  const { rows, errors: parseErrors } = parseAllImportRows(aoa, map);

  const classifications = await prisma.clientClassification.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: { id: true, slug: true, isBRow: true, sortOrder: true },
  });
  const bClass = classifications.find((c) => c.isBRow) ?? null;
  const allLite: ClassificationLite[] = classifications;

  if (!bClass) {
    return NextResponse.json(
      { message: "لا يوجد تصنيف B في النظام. أضف تصنيفاً من الإعدادات." },
      { status: 400 }
    );
  }
  if (allLite.filter((c) => !c.isBRow).length === 0 && importType === "not-b") {
    return NextResponse.json(
      { message: "لا يوجد تصنيف Not B في النظام." },
      { status: 400 }
    );
  }

  const duplicates: { name: string; phone: string }[] = [];
  const errors: { row: number; reason: string }[] = [...parseErrors];
  let imported = 0;
  let skipped = 0;

  const phonesInFile = new Set<string>();
  for (const r of rows) {
    phonesInFile.add(r.phone);
    if (r.phone2) phonesInFile.add(r.phone2);
  }

  const phoneList = [...phonesInFile];
  const existingClients =
    phoneList.length === 0
      ? []
      : await prisma.client.findMany({
          where: {
            OR: [{ phone: { in: phoneList } }, { phone2: { in: phoneList } }],
          },
          select: { id: true, name: true, phone: true, phone2: true },
        });

  const existingPhoneHit = new Set<string>();
  for (const e of existingClients) {
    existingPhoneHit.add(e.phone);
    if (e.phone2) existingPhoneHit.add(e.phone2);
  }

  function isDuplicate(p: ParsedImportRow): boolean {
    if (existingPhoneHit.has(p.phone)) return true;
    if (p.phone2 && existingPhoneHit.has(p.phone2)) return true;
    return false;
  }

  function registerPhones(p: ParsedImportRow) {
    existingPhoneHit.add(p.phone);
    if (p.phone2) existingPhoneHit.add(p.phone2);
  }

  for (const row of rows) {
    if (isDuplicate(row)) {
      skipped++;
      const dup = existingClients.find(
        (c) =>
          c.phone === row.phone ||
          c.phone === row.phone2 ||
          c.phone2 === row.phone ||
          (row.phone2 &&
            (c.phone === row.phone2 ||
              c.phone2 === row.phone2))
      );
      duplicates.push({
        name: dup?.name ?? row.name,
        phone: dup?.phone ?? row.phone,
      });
      continue;
    }

    const { classificationId, status } = resolveClassificationId({
      importType,
      clientTypeRaw: row.clientTypeRaw,
      bClass,
      all: allLite,
    });

    const customExtra = mergeCustomFields(row.daysRaw);

    try {
      await prisma.client.create({
        data: {
          name: row.name,
          phone: row.phone,
          phone2: row.phone2,
          company: row.company,
          position: row.position,
          address: row.address,
          activity: row.activity,
          quotePrice: parseOptionalDecimal(row.quotePrice ?? undefined),
          allowedDiscount: parseOptionalDecimal(
            row.allowedDiscount ?? undefined
          ),
          status,
          classificationId,
          sourceAdName: row.sourceAdName,
          adPlatform: row.adPlatform,
          managementRecommendationText: row.managementRecommendationText,
          managementRecommendationDate: row.managementRecommendationDate,
          currentSituation: row.currentSituation,
          callSummary: row.callSummary,
          salesNotes: row.salesNotes,
          clientWarmingText: row.clientWarmingText,
          visitAppointmentScheduled: row.visitAppointmentScheduled,
          visitAppointmentDate: row.visitAppointmentDate,
          presentingEmployeeName: row.presentingEmployeeName,
          qqAnswer: row.qqAnswer,
          lossReason: row.lossReason,
          initialCallDate: row.initialCallDate,
          nextFollowUpAt: row.nextFollowUpAt,
          followUpSlots: row.followUpSlots as unknown as Prisma.InputJsonValue,
          ...(customExtra !== undefined
            ? { customFields: customExtra as Prisma.InputJsonValue }
            : {}),
          assignedUserId: dbUserId,
          quoteDetail: null,
        },
      });
      registerPhones(row);
      imported++;
    } catch (e) {
      errors.push({
        row: row.excelRow,
        reason: e instanceof Error ? e.message : "فشل الحفظ",
      });
    }
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: dbUserId,
        entity: "Client",
        kind: "IMPORT",
        action: "EXCEL_IMPORT",
        summary: `استيراد Excel — ${importType} — تم ${imported}، تجاهل ${skipped}`,
        meta: {
          importType,
          imported,
          skipped,
          errorCount: errors.length,
        } as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    console.error("audit log import", e);
  }

  return NextResponse.json({
    ok: true,
    imported,
    skipped,
    errors,
    duplicates,
  });
}
