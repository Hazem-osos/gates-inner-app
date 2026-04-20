"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { buildArabicAuditLinesFromPatch } from "@/lib/audit/report-patch-diff";
import { prisma } from "@/lib/prisma";

export type PatchResult = { ok: true } | { ok: false; message: string };

function parseDt(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseOptionalDecimal(v: string | undefined): Prisma.Decimal | null {
  if (v === undefined || v === null || v === "") return null;
  try {
    return new Prisma.Decimal(v);
  } catch {
    return null;
  }
}

export type ReportClientPatchInput = {
  name?: string;
  phone?: string;
  phone2?: string | null;
  company?: string | null;
  position?: string | null;
  address?: string | null;
  activity?: string | null;
  quotePrice?: string | null;
  quoteDetail?: string | null;
  callSummary?: string | null;
  currentSituation?: string | null;
  salesNotes?: string | null;
  finalStatusNote?: string | null;
  clientWarmingText?: string | null;
  presentingEmployeeName?: string | null;
  sourceAdName?: string | null;
  adPlatform?: string | null;
  managementRecommendationText?: string | null;
  managementRecommendationDate?: string | null;
  nextFollowUpAt?: string;
  visitAppointmentScheduled?: boolean;
  visitAppointmentDate?: string | null;
  qqAnswer?: boolean | null;
  followUpSlots?: unknown;
  classificationId?: string | null;
};

function normalizeFollowSlots(raw: unknown): Prisma.InputJsonValue {
  if (raw === undefined) return undefined as unknown as Prisma.InputJsonValue;
  if (Array.isArray(raw)) {
    return raw as unknown as Prisma.InputJsonValue;
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return (Array.isArray(p) ? p : []) as unknown as Prisma.InputJsonValue;
    } catch {
      return [] as unknown as Prisma.InputJsonValue;
    }
  }
  return [] as unknown as Prisma.InputJsonValue;
}

export async function patchClientReportFields(
  clientId: string,
  patch: ReportClientPatchInput
): Promise<PatchResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "غير مصرح." };

  const dbUserId = await resolveSessionDbUserId(session);
  if (!dbUserId) {
    return {
      ok: false,
      message:
        "تعذر ربط حسابك بقاعدة البيانات. أعد تسجيل الدخول ثم أعد المحاولة.",
    };
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, message: "العميل غير موجود." };
  if (
    session.role === "SALES" &&
    client.assignedUserId &&
    client.assignedUserId !== dbUserId
  ) {
    return { ok: false, message: "لا يمكنك تعديل هذا العميل." };
  }

  try {
    const data: Prisma.ClientUpdateInput = {};

    if (patch.name !== undefined) data.name = patch.name;
    if (patch.phone !== undefined) data.phone = patch.phone;
    if (patch.phone2 !== undefined) data.phone2 = patch.phone2;
    if (patch.company !== undefined) data.company = patch.company;
    if (patch.position !== undefined) data.position = patch.position;
    if (patch.address !== undefined) data.address = patch.address;
    if (patch.activity !== undefined) data.activity = patch.activity;

    if (patch.quotePrice !== undefined) {
      data.quotePrice = parseOptionalDecimal(patch.quotePrice ?? undefined);
    }
    if (patch.quoteDetail !== undefined) data.quoteDetail = patch.quoteDetail;
    if (patch.callSummary !== undefined)
      data.callSummary = patch.callSummary;
    if (patch.currentSituation !== undefined)
      data.currentSituation = patch.currentSituation;
    if (patch.salesNotes !== undefined) data.salesNotes = patch.salesNotes;
    if (patch.finalStatusNote !== undefined)
      data.finalStatusNote = patch.finalStatusNote;
    if (patch.clientWarmingText !== undefined)
      data.clientWarmingText = patch.clientWarmingText;
    if (patch.presentingEmployeeName !== undefined)
      data.presentingEmployeeName = patch.presentingEmployeeName;
    if (patch.sourceAdName !== undefined)
      data.sourceAdName = patch.sourceAdName;
    if (patch.adPlatform !== undefined) data.adPlatform = patch.adPlatform;

    if (patch.managementRecommendationText !== undefined) {
      data.managementRecommendationText = patch.managementRecommendationText;
    }
    if (patch.managementRecommendationDate !== undefined) {
      const s = patch.managementRecommendationDate?.trim();
      data.managementRecommendationDate =
        s && s !== "" ? parseDt(s) : null;
    }

    if (patch.nextFollowUpAt !== undefined) {
      const t = patch.nextFollowUpAt.trim();
      if (t === "") {
        return { ok: false, message: "تاريخ المتابعة التالي لا يمكن أن يكون فارغاً." };
      }
      const n = parseDt(t);
      if (!n) return { ok: false, message: "تاريخ متابعة غير صالح." };
      data.nextFollowUpAt = n;
    }

    if (patch.visitAppointmentScheduled !== undefined) {
      data.visitAppointmentScheduled = patch.visitAppointmentScheduled;
    }
    if (patch.visitAppointmentDate !== undefined) {
      data.visitAppointmentDate = patch.visitAppointmentDate
        ? parseDt(patch.visitAppointmentDate)
        : null;
    }

    if (patch.qqAnswer !== undefined) data.qqAnswer = patch.qqAnswer;
    if (patch.followUpSlots !== undefined) {
      data.followUpSlots = normalizeFollowSlots(patch.followUpSlots);
    }
    if (patch.classificationId !== undefined) {
      data.classification = patch.classificationId
        ? { connect: { id: patch.classificationId } }
        : { disconnect: true };
    }

    await prisma.client.update({
      where: { id: clientId },
      data,
    });

    const auditLines = buildArabicAuditLinesFromPatch(client, patch);
    const auditSummary =
      auditLines.length > 0 ? auditLines.join(" — ") : "حفظ من التقرير";

    await prisma.auditLog.create({
      data: {
        userId: dbUserId,
        clientId,
        entity: "Client",
        entityId: clientId,
        action: "REPORT_CELL_EDIT",
        kind: "REPORT_CELL_EDIT",
        summary: auditSummary,
        meta: {
          v: 2,
          lines:
            auditLines.length > 0
              ? auditLines
              : ["حفظ من التقرير (لم يُكتشف فرق في الحقول المعروضة)"],
        } as Prisma.InputJsonValue,
      },
    });

    /** تجنّب إبطال كل مسارات التقارير عند كل حفظ — الصفحات الأكثر ارتباطاً ببيانات التقرير */
    revalidatePath("/dashboard");
    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/reports/b");
    revalidatePath("/reports/not-b");
    revalidatePath("/reports/closed");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "فشل الحفظ." };
  }
}
