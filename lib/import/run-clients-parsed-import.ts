import { ClientStatus, Prisma } from "@prisma/client";

import type { ImportType, ParsedImportRow } from "@/lib/import/excel-client-import";
import { prisma } from "@/lib/prisma";

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

export type ClientsParsedImportResult = {
  ok: true;
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
  duplicates: { name: string; phone: string }[];
  message?: string;
};

export async function runClientsParsedImport(args: {
  importType: ImportType;
  rows: ParsedImportRow[];
  dbUserId: string;
}): Promise<ClientsParsedImportResult | { ok: false; message: string }> {
  const { importType, rows, dbUserId } = args;

  const classifications = await prisma.clientClassification.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: { id: true, slug: true, isBRow: true, sortOrder: true },
  });
  const bClass = classifications.find((c) => c.isBRow) ?? null;
  const allLite: ClassificationLite[] = classifications;

  if (!bClass) {
    return { ok: false, message: "لا يوجد تصنيف B في النظام. أضف تصنيفاً من الإعدادات." };
  }
  if (allLite.filter((c) => !c.isBRow).length === 0 && importType === "not-b") {
    return { ok: false, message: "لا يوجد تصنيف Not B في النظام." };
  }

  const duplicates: { name: string; phone: string }[] = [];
  const errors: { row: number; reason: string }[] = [];
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
          select: {
            id: true,
            name: true,
            phone: true,
            phone2: true,
            status: true,
            assignedUserId: true,
          },
        });

  const existingPhoneHit = new Set<string>();
  for (const e of existingClients) {
    existingPhoneHit.add(e.phone);
    if (e.phone2) existingPhoneHit.add(e.phone2);
  }

  function findExistingByPhones(p: ParsedImportRow) {
    return existingClients.find(
      (c) =>
        c.phone === p.phone ||
        c.phone === p.phone2 ||
        c.phone2 === p.phone ||
        (p.phone2 && (c.phone === p.phone2 || c.phone2 === p.phone2))
    );
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
    const { classificationId, status } = resolveClassificationId({
      importType,
      clientTypeRaw: row.clientTypeRaw,
      bClass,
      all: allLite,
    });

    const customExtra = mergeCustomFields(row.daysRaw);

    const dup = findExistingByPhones(row);
    const phonesTaken = isDuplicate(row);

    const canUpsertFromBExcel =
      importType === "b" &&
      status === ClientStatus.B &&
      dup != null &&
      (dup.status === ClientStatus.NOT_B || dup.status === ClientStatus.B);

    if (phonesTaken && canUpsertFromBExcel) {
      try {
        await prisma.client.update({
          where: { id: dup.id },
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
            notBClassification: null,
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
            closedLostAt: null,
            initialCallDate: row.initialCallDate,
            nextFollowUpAt: row.nextFollowUpAt,
            followUpSlots: row.followUpSlots as unknown as Prisma.InputJsonValue,
            ...(customExtra !== undefined
              ? { customFields: customExtra as Prisma.InputJsonValue }
              : {}),
            assignedUserId: dup.assignedUserId ?? dbUserId,
            quoteDetail: null,
          },
        });
        registerPhones(row);
        imported++;
      } catch (e) {
        errors.push({
          row: row.excelRow,
          reason: e instanceof Error ? e.message : "فشل التحديث",
        });
      }
      continue;
    }

    if (phonesTaken) {
      skipped++;
      duplicates.push({
        name: dup?.name ?? row.name,
        phone: dup?.phone ?? row.phone,
      });
      continue;
    }

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
          notBClassification: null,
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
          closedLostAt: null,
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

  return {
    ok: true,
    imported,
    skipped,
    errors,
    duplicates,
  };
}
