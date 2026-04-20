import { ClientStatus, Prisma, type UserRole } from "@prisma/client";

import { patchClientReportFields } from "@/app/actions/report-client-patch";
import { excelRowToReportClientPatch } from "@/lib/export/report-b-flat";
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
          const wd = new Date(workDateStr);
          if (!Number.isNaN(wd.getTime())) data.workDate = wd;
        }
        if (recDateStr) {
          const rd = new Date(recDateStr);
          if (!Number.isNaN(rd.getTime())) data.recommendationDate = rd;
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
      if (!parsed) continue;
      const { clientId, patch } = parsed;
      const cv = cellStr(row, [
        "contractValue",
        "قيمة_التعاقد",
        "قيمة_العقد",
        "قيمة العقد",
      ]);
      const sd = cellStr(row, ["saleDate", "تاريخ_البيع", "تاريخ البيع"]);

      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { status: true, assignedUserId: true },
      });
      if (!client) {
        errors.push(`صف ${rowNum}: عميل غير موجود`);
        continue;
      }
      if (!importStatusOk(kind, client.status)) {
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
        !(kind === "report-won" && (cv !== "" || sd !== ""))
      ) {
        continue;
      }

      if (keys.length > 0) {
        const res = await patchClientReportFields(clientId, patch, {
          reportKey: reportKeyForExcelImportKind(kind),
        });
        if (!res.ok) {
          errors.push(`صف ${rowNum}: ${res.message}`);
          continue;
        }
      }

      if (kind === "report-won" && (cv || sd)) {
        try {
          await prisma.client.update({
            where: { id: clientId },
            data: {
              ...(cv
                ? { contractValue: new Prisma.Decimal(cv.replace(/,/g, "")) }
                : {}),
              ...(sd ? { saleDate: new Date(sd) } : {}),
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
