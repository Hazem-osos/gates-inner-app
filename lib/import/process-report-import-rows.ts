import { ClientStatus, Prisma, type UserRole } from "@prisma/client";

import { patchClientReportFields } from "@/app/actions/report-client-patch";
import {
  excelRowToReportClientPatch,
  normalizedPrimaryPhoneFromReportRow,
  rawPrimaryPhoneFromReportRow,
} from "@/lib/export/report-b-flat";
import { parseExcelDateCell, parsePhones } from "@/lib/import/excel-client-import";
import { canAccessClient } from "@/lib/report-scope";
import { prisma } from "@/lib/prisma";

function cellStr(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    if (!(k in row)) continue;
    const v = row[k];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s !== "") return s;
  }
  return "";
}

/** مطابقات شائعة لأرقام مصرية مُخزَّنة بصيغ مختلفة عن تصدير Excel */
function phoneVariantsForDbLookup(normalizedDigits: string): string[] {
  const d = normalizedDigits.replace(/\D/g, "");
  if (!d || d.length < 8) return [];
  const out = new Set<string>();
  out.add(d);
  if (d.startsWith("0") && d.length >= 10) out.add(d.slice(1));
  if (!d.startsWith("0") && /^1\d{8,10}$/.test(d)) out.add(`0${d}`);
  if (d.startsWith("01") && d.length === 11) {
    out.add(`20${d.slice(1)}`);
    out.add(`+20${d.slice(1)}`);
  }
  return [...out];
}

function boolFromCell(v: string): boolean | undefined {
  const t = v.trim().toLowerCase();
  if (!t) return undefined;
  if (t === "true" || t === "yes" || t === "1" || t === "نعم") return true;
  if (t === "false" || t === "no" || t === "0" || t === "لا") return false;
  return undefined;
}

export function reportKeyForExcelImportKind(kind: string): string {
  if (kind === "dashboard-followups") return "report-dashboard-followups";
  return kind;
}

function importStatusOk(kind: string, status: ClientStatus): boolean {
  if (kind === "report-b") return status === ClientStatus.B;
  if (kind === "report-not-b") return status === ClientStatus.NOT_B;
  if (kind === "report-closed") return status === ClientStatus.LOST;
  if (kind === "report-won") return status === ClientStatus.WON;
  if (kind === "dashboard-followups") {
    return status === ClientStatus.B || status === ClientStatus.NOT_B;
  }
  return true;
}

function matchesNormalizedPhone(
  needleDigits: string,
  storedField: string | null
): boolean {
  if (!storedField) return false;
  const a = needleDigits.replace(/\D/g, "");
  const b = parsePhones(storedField).phone.replace(/\D/g, "");
  if (!a || !b) return false;
  if (a === b) return true;
  const take = Math.min(a.length, b.length, 11);
  return take >= 8 && a.slice(-take) === b.slice(-take);
}

/** لـ SQL: قيم فريدة أرقام فقط (بدون + ومسافات) */
function digitOnlyVariants(variants: string[]): string[] {
  return [
    ...new Set(
      variants
        .map((v) => v.replace(/\D/g, ""))
        .filter((v) => v.length >= 8)
    ),
  ];
}

/**
 * مطابقة أرقام بعد إزالة أي رموز من الحقل (مسافات، +، …) — MySQL 8+.
 * لا يُصفّى بحالة العميل — البحث بالهاتف فقط (حتى يُوجد عميل بـ B/Not B ثم يُحدَّث لاحقاً).
 */
async function findClientsByMysqlDigitVariants(
  digitVariants: string[]
): Promise<
  Array<{
    id: string;
    status: ClientStatus;
    assignedUserId: string | null;
    phone: string | null;
    phone2: string | null;
  }>
> {
  if (digitVariants.length === 0) return [];
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        status: ClientStatus;
        assignedUserId: string | null;
        phone: string | null;
        phone2: string | null;
      }>
    >`
      SELECT c.id, c.status, c.assignedUserId, c.phone, c.phone2
      FROM Client c
      WHERE (
        REGEXP_REPLACE(COALESCE(c.phone, ''), '[^0-9]', '') IN (${Prisma.join(digitVariants)})
        OR REGEXP_REPLACE(COALESCE(c.phone2, ''), '[^0-9]', '') IN (${Prisma.join(digitVariants)})
      )
      LIMIT 60
    `;
    return rows;
  } catch (e) {
    console.error("mysql digit match import", e);
    return [];
  }
}

type PhoneRowMatch = {
  id: string;
  status: ClientStatus;
  assignedUserId: string | null;
  phone: string | null;
  phone2: string | null;
};

/** يختار صفاً واحداً أو يُبلغ عن تعدد المطابقات */
function finalizePhoneRows(
  rows: PhoneRowMatch[],
  needle: string,
  d: string,
  rowNum: number,
  errors: string[]
): {
  client: {
    id: string;
    status: ClientStatus;
    assignedUserId: string | null;
  } | null;
  skipGenericNotFoundMessage?: boolean;
} {
  const matches = rows.filter(
    (c) =>
      matchesNormalizedPhone(needle, c.phone) ||
      (c.phone2 ? matchesNormalizedPhone(needle, c.phone2) : false)
  );
  if (matches.length === 1) {
    const m = matches[0]!;
    return {
      client: {
        id: m.id,
        status: m.status,
        assignedUserId: m.assignedUserId,
      },
    };
  }
  if (matches.length === 0) {
    return { client: null };
  }
  const exactDigit = matches.filter(
    (c) =>
      parsePhones(c.phone ?? "").phone.replace(/\D/g, "") === d ||
      (c.phone2 &&
        parsePhones(c.phone2).phone.replace(/\D/g, "") === d)
  );
  if (exactDigit.length === 1) {
    const m = exactDigit[0]!;
    return {
      client: {
        id: m.id,
        status: m.status,
        assignedUserId: m.assignedUserId,
      },
    };
  }
  errors.push(
    `صف ${rowNum}: أكثر من عميل (${matches.length}) يطابق نفس الرقم — نقِّ بيانات التقرير أو راجع الأرقام`
  );
  return { client: null, skipGenericNotFoundMessage: true };
}

/**
 * مطابقة هاتف: نص دقيق → أرقام فقط (SQL) → contains.
 * لا يُطبَّق نطاق السيلز على البحث — يُفحَص لاحقاً بـ canAccessClient (تجنّباً لرسالة «لا يوجد عميل» خطأ).
 */
async function findClientRowByImportPhone(
  needle: string,
  _sessionRole: UserRole,
  _dbUserId: string,
  rowNum: number,
  errors: string[],
  rawPhoneForLog?: unknown
): Promise<{
  client: {
    id: string;
    status: ClientStatus;
    assignedUserId: string | null;
  } | null;
  skipGenericNotFoundMessage?: boolean;
}> {
  const variants = phoneVariantsForDbLookup(needle);
  if (variants.length === 0) return { client: null };

  console.log(
    "DB Query -> Raw Excel Phone:",
    rawPhoneForLog !== undefined ? rawPhoneForLog : "(n/a)",
    " | Normalized to:",
    needle
  );

  const exact = await prisma.client.findFirst({
    where: {
      OR: variants.flatMap((v) => [{ phone: v }, { phone2: v }]),
    },
    select: { id: true, status: true, assignedUserId: true },
  });
  if (exact) return { client: exact };

  const d = needle.replace(/\D/g, "");
  if (d.length < 8) return { client: null };

  const digitVars = digitOnlyVariants(variants);
  const rawRows = await findClientsByMysqlDigitVariants(digitVars);
  const fromRaw = finalizePhoneRows(rawRows, needle, d, rowNum, errors);
  if (fromRaw.client || fromRaw.skipGenericNotFoundMessage) {
    return fromRaw;
  }

  const tail10 = d.slice(-10);
  const tail9 = d.slice(-9);

  const orContains: Prisma.ClientWhereInput[] = [
    { phone: { contains: tail10 } },
    { phone2: { contains: tail10 } },
  ];
  if (tail9 !== tail10 && tail9.length >= 8) {
    orContains.push({ phone: { contains: tail9 } });
    orContains.push({ phone2: { contains: tail9 } });
  }

  const candidates = await prisma.client.findMany({
    where: {
      OR: orContains,
    },
    select: {
      id: true,
      status: true,
      assignedUserId: true,
      phone: true,
      phone2: true,
    },
    take: 200,
  });

  return finalizePhoneRows(candidates, needle, d, rowNum, errors);
}

export type ProcessReportImportContext = {
  kind: string;
  sessionRole: UserRole;
  dbUserId: string;
};

/**
 * نفس منطق `/api/import/report-xlsx` لكن على صفوف جاهزة (مثلاً بعد تعيين أعمدة من الواجهة).
 */
export async function processReportImportRows(
  rows: Record<string, unknown>[],
  ctx: ProcessReportImportContext
): Promise<{ updated: number; processed: number; errors: string[] }> {
  const { kind, sessionRole, dbUserId } = ctx;
  const errors: string[] = [];
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      if (kind === "warming") {
        const clientId = cellStr(row, ["id", "معرف", "client_id"]);
        if (!clientId) continue;
        const client = await prisma.client.findUnique({
          where: { id: clientId },
          select: { id: true, assignedUserId: true },
        });
        if (!client) {
          errors.push(`صف ${rowNum}: عميل غير موجود`);
          continue;
        }
        if (
          !canAccessClient(sessionRole, dbUserId, client.assignedUserId ?? null)
        ) {
          errors.push(`صف ${rowNum}: لا صلاحية`);
          continue;
        }

        const day2 = cellStr(row, ["اليوم_الثاني", "day2Content"]);
        const day3 = cellStr(row, ["اليوم_الثالث", "day3Content"]);
        const d1s = cellStr(row, ["تم_اليوم1", "day1Done"]);
        const d2s = cellStr(row, ["تم_اليوم2", "day2Done"]);
        const d3s = cellStr(row, ["تم_اليوم3", "day3Done"]);

        await prisma.$transaction(async (tx) => {
          const v = cellStr(row, ["اليوم_الأول", "clientWarmingText"]);
          await tx.client.update({
            where: { id: clientId },
            data: {
              clientWarmingText: v.trim() ? v : null,
            },
          });

          let w = await tx.warmingToolSent.findFirst({
            where: { clientId },
            orderBy: { createdAt: "desc" },
          });
          if (!w) w = await tx.warmingToolSent.create({ data: { clientId } });
          const d1 = boolFromCell(d1s);
          const d2 = boolFromCell(d2s);
          const d3 = boolFromCell(d3s);
          await tx.warmingToolSent.update({
            where: { id: w.id },
            data: {
              ...(d1 !== undefined ? { day1Done: d1 } : {}),
              ...(d2 !== undefined ? { day2Done: d2 } : {}),
              ...(d3 !== undefined ? { day3Done: d3 } : {}),
              day2Content: day2.trim() ? day2 : null,
              day3Content: day3.trim() ? day3 : null,
            },
          });

          await tx.auditLog.create({
            data: {
              userId: dbUserId,
              clientId,
              entity: "WarmingToolSent",
              entityId: clientId,
              kind: "IMPORT_ROW",
              action: "WARMING_IMPORT",
              summary: "استيراد Excel — Warming",
              meta: JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue,
            },
          });
        });
        updated++;
        continue;
      }

      if (kind === "report-recommendations") {
        const recId = cellStr(row, [
          "recommendation_id",
          "id",
          "معرف_التوصية",
          "معرف التوصية",
        ]);
        if (!recId) continue;
        const rec = await prisma.managementRecommendation.findUnique({
          where: { id: recId },
          include: {
            client: { select: { assignedUserId: true } },
          },
        });
        if (!rec?.client) {
          errors.push(`صف ${rowNum}: توصية غير موجودة`);
          continue;
        }
        if (
          !canAccessClient(
            sessionRole,
            dbUserId,
            rec.client.assignedUserId ?? null
          )
        ) {
          errors.push(`صف ${rowNum}: لا صلاحية`);
          continue;
        }
        const body = cellStr(row, ["التوصية", "body"]);
        const actionTaken = cellStr(row, ["الإجراء_المتخذ", "actionTaken"]);
        const workDateStr = cellStr(row, ["تاريخ_العمل", "workDate"]);
        const recDateStr = cellStr(row, ["تاريخ_التوصية", "recommendationDate"]);

        const data: Prisma.ManagementRecommendationUpdateInput = {};
        if (body !== "") data.body = body;
        if ("الإجراء_المتخذ" in row || "actionTaken" in row) {
          data.actionTaken = actionTaken || null;
        }
        if (workDateStr) {
          const wd = parseExcelDateCell(workDateStr);
          if (wd) data.workDate = wd;
        }
        if (recDateStr) {
          const rd = parseExcelDateCell(recDateStr);
          if (rd) data.recommendationDate = rd;
        }

        if (Object.keys(data).length === 0) {
          errors.push(`صف ${rowNum}: لا حقول للتحديث`);
          continue;
        }

        await prisma.managementRecommendation.update({
          where: { id: recId },
          data,
        });
        await prisma.auditLog.create({
          data: {
            userId: dbUserId,
            clientId: rec.clientId,
            entity: "ManagementRecommendation",
            entityId: recId,
            kind: "IMPORT_ROW",
            action: "RECOMMENDATION_IMPORT",
            summary: "استيراد Excel — توصية",
          },
        });
        updated++;
        continue;
      }

      const parsed = excelRowToReportClientPatch(row);
      if (!parsed) {
        errors.push(
          `صف ${rowNum}: لا يوجد هاتف صالح (أو معرّف عميل) لتحديد الصف`
        );
        continue;
      }
      const { patch } = parsed;
      const cv = cellStr(row, [
        "contractValue",
        "قيمة_التعاقد",
        "قيمة_العقد",
        "قيمة العقد",
      ]);
      const sd = cellStr(row, ["saleDate", "تاريخ_البيع", "تاريخ البيع"]);

      let client: {
        id: string;
        status: ClientStatus;
        assignedUserId: string | null;
      } | null = null;

      if (parsed.clientId) {
        client = await prisma.client.findUnique({
          where: { id: parsed.clientId },
          select: { id: true, status: true, assignedUserId: true },
        });
      } else {
        const phone = normalizedPrimaryPhoneFromReportRow(row);
        if (!phone || phone.length !== 11) {
          errors.push(`صف ${rowNum}: رقم هاتف غير صالح بعد التطبيع`);
          continue;
        }
        const phoneLookup = await findClientRowByImportPhone(
          phone,
          sessionRole,
          dbUserId,
          rowNum,
          errors,
          rawPrimaryPhoneFromReportRow(row)
        );
        client = phoneLookup.client;
        if (!client && phoneLookup.skipGenericNotFoundMessage) {
          continue;
        }
      }

      if (!client) {
        errors.push(
          parsed.clientId
            ? `صف ${rowNum}: عميل غير موجود`
            : `صف ${rowNum}: لا يوجد عميل بهذا الهاتف ضمن هذا التقرير. ثبّت عمود «هاتف» من التصدير أو تأكد أن الرقم مطابق للقاعدة (نفس صيغة الملف المصدَّر).`
        );
        continue;
      }

      const clientId = client.id;
      if (
        kind !== "report-closed" &&
        !importStatusOk(kind, client.status)
      ) {
        errors.push(`صف ${rowNum}: حالة العميل لا تطابق نوع التقرير`);
        continue;
      }
      if (
        !canAccessClient(sessionRole, dbUserId, client.assignedUserId ?? null)
      ) {
        errors.push(`صف ${rowNum}: لا صلاحية`);
        continue;
      }

      const keys = Object.keys(patch).filter(
        (k) => (patch as Record<string, unknown>)[k] !== undefined
      );
      if (
        keys.length === 0 &&
        !(kind === "report-won" && (cv !== "" || sd !== "")) &&
        kind !== "report-closed"
      ) {
        errors.push(
          `صف ${rowNum}: لا حقول للتحديث — راجع ربط أعمدة Excel (لا تُرسل قيماً فارغة لكل الحقول أو احذف الصف الفارغ)`
        );
        continue;
      }

      if (keys.length > 0) {
        const res = await patchClientReportFields(clientId, patch, {
          reportKey: reportKeyForExcelImportKind(kind),
          importActor: { dbUserId, role: sessionRole },
        });
        if (!res.ok) {
          errors.push(`صف ${rowNum}: ${res.message}`);
          continue;
        }
      }

      if (kind === "report-closed") {
        try {
          await prisma.client.update({
            where: { id: clientId },
            data: { status: ClientStatus.LOST },
          });
        } catch (e) {
          console.error(e);
          errors.push(`صف ${rowNum}: فشل تعيين حالة «مغلق» للعميل`);
          continue;
        }
      }

      if (kind === "report-won" && (cv || sd)) {
        const saleDateParsed = sd ? parseExcelDateCell(sd) : null;
        try {
          await prisma.client.update({
            where: { id: clientId },
            data: {
              ...(cv
                ? { contractValue: new Prisma.Decimal(cv.replace(/,/g, "")) }
                : {}),
              ...(saleDateParsed ? { saleDate: saleDateParsed } : {}),
            },
          });
        } catch {
          errors.push(`صف ${rowNum}: قيمة بيع أو تاريخ غير صالح`);
          continue;
        }
      }

      updated++;
    } catch (e) {
      console.error(e);
      errors.push(`صف ${rowNum}: فشل غير متوقع`);
    }
  }

  return {
    updated,
    processed: rows.length,
    errors: errors.slice(0, 40),
  };
}
