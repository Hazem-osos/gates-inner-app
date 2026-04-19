"use server";

import { ClientStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  getSessionUser,
  resolveSessionDbUserId,
  type SessionUser,
} from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type TransitionResult = { ok: true } | { ok: false; message: string };

export type ReopenClosedResult =
  | { ok: true; redirectReport: "b" | "not-b" }
  | { ok: false; message: string };

function parseSaleDecimal(v: string): Prisma.Decimal | null {
  try {
    return new Prisma.Decimal(v.trim());
  } catch {
    return null;
  }
}

async function ensureCanEditClient(
  session: SessionUser,
  dbUserId: string,
  clientId: string
): Promise<boolean> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { assignedUserId: true },
  });
  if (!client) return false;
  if (
    session.role === "SALES" &&
    client.assignedUserId &&
    client.assignedUserId !== dbUserId
  )
    return false;
  return true;
}

type ResolvedDbUser =
  | { ok: true; dbUserId: string }
  | { ok: false; message: string };

async function resolveDbUserOrError(
  session: SessionUser
): Promise<ResolvedDbUser> {
  const dbUserId = await resolveSessionDbUserId(session);
  if (!dbUserId) {
    return {
      ok: false,
      message:
        "لم يُعثر على حساب المستخدم في النظام. سجّل الخروج ثم الدخول مرة أخرى.",
    };
  }
  return { ok: true, dbUserId };
}

/** إغلاق عميل من التقرير — الحالة LOST مع سبب وتاريخ */
export async function closeClientFromReport(
  clientId: string,
  reason: string
): Promise<TransitionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "غير مصرح." };
  const resolved = await resolveDbUserOrError(session);
  if (!resolved.ok) return { ok: false, message: resolved.message };
  const { dbUserId } = resolved;
  const r = reason.trim();
  if (!r) return { ok: false, message: "سبب الإغلاق مطلوب." };
  if (!(await ensureCanEditClient(session, dbUserId, clientId)))
    return { ok: false, message: "لا يمكنك تنفيذ هذا الإجراء." };

  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return { ok: false, message: "العميل غير موجود." };

    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: clientId },
        data: {
          status: ClientStatus.LOST,
          lossReason: r,
          closedLostAt: new Date(),
        },
      });
      await tx.clientStatusChange.create({
        data: {
          clientId,
          fromStatus: client.status,
          toStatus: ClientStatus.LOST,
          note: r,
          changedById: dbUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: dbUserId,
          clientId,
          entity: "Client",
          entityId: clientId,
          action: "CLOSE_FROM_REPORT_B",
          kind: "STATUS_CHANGE",
          summary: `إغلاق من تقرير B: ${r.slice(0, 120)}`,
          meta: { reason: r } as unknown as Prisma.InputJsonValue,
        },
      });
    });

    revalidatePath("/reports/b");
    revalidatePath("/reports/closed");
    revalidatePath("/dashboard");
    revalidatePath("/clients");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "فشل تنفيذ الإغلاق." };
  }
}

/**
 * إعادة فتح عميل مغلق: استعادة الحالة السابقة (B أو Not B) من سجل التغييرات،
 * مع الحفاظ على التصنيف المخزّن ما لم يكن يحتاج تصحيحاً لمطابقة مسار B.
 */
export async function reopenClosedClientFromReport(
  clientId: string
): Promise<ReopenClosedResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "غير مصرح." };
  const resolved = await resolveDbUserOrError(session);
  if (!resolved.ok) return { ok: false, message: resolved.message };
  const { dbUserId } = resolved;
  if (!(await ensureCanEditClient(session, dbUserId, clientId)))
    return { ok: false, message: "لا يمكنك تنفيذ هذا الإجراء." };

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        classification: { select: { id: true, isBRow: true } },
      },
    });
    if (!client) return { ok: false, message: "العميل غير موجود." };
    if (client.status !== ClientStatus.LOST) {
      return { ok: false, message: "العميل ليس في حالة مغلق." };
    }

    const lastLost = await prisma.clientStatusChange.findFirst({
      where: { clientId, toStatus: ClientStatus.LOST },
      orderBy: { createdAt: "desc" },
      select: { fromStatus: true },
    });

    let targetStatus: ClientStatus | null = lastLost?.fromStatus ?? null;
    if (
      targetStatus === ClientStatus.WON ||
      targetStatus === ClientStatus.LOST
    ) {
      targetStatus = null;
    }
    if (!targetStatus) {
      if (client.classification?.isBRow) targetStatus = ClientStatus.B;
      else if (client.classificationId) targetStatus = ClientStatus.NOT_B;
      else targetStatus = ClientStatus.B;
    }

    const bRowCls = await prisma.clientClassification.findFirst({
      where: { isBRow: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      const data: Prisma.ClientUncheckedUpdateInput = {
        status: targetStatus,
        lossReason: null,
        closedLostAt: null,
      };

      if (targetStatus === ClientStatus.B) {
        data.notBClassification = null;
        const curIsB = client.classification?.isBRow === true;
        if (!curIsB && bRowCls) {
          data.classificationId = bRowCls.id;
        }
      } else {
        const main = client.classificationId;
        if (main) {
          data.notBClassification = client.notBClassification ?? main;
          data.classificationId = main;
        }
      }

      await tx.client.update({
        where: { id: clientId },
        data,
      });

      await tx.clientStatusChange.create({
        data: {
          clientId,
          fromStatus: ClientStatus.LOST,
          toStatus: targetStatus,
          note: "إعادة فتح من تقرير العملاء المغلقة",
          changedById: dbUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: dbUserId,
          clientId,
          entity: "Client",
          entityId: clientId,
          action: "REOPEN_FROM_CLOSED_REPORT",
          kind: "STATUS_CHANGE",
          summary: `إعادة فتح — ${targetStatus}`,
          meta: {
            previousStatus: targetStatus,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    });

    revalidatePath("/reports/closed");
    revalidatePath("/reports/b");
    revalidatePath("/reports/not-b");
    revalidatePath("/dashboard");
    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);

    const redirectReport =
      targetStatus === ClientStatus.B ? ("b" as const) : ("not-b" as const);
    return { ok: true, redirectReport };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "فشل إعادة فتح العميل." };
  }
}

/** نقل إلى Not B مع تصنيف (غير B) */
export async function moveClientToNotBFromReport(
  clientId: string,
  newClassificationId: string
): Promise<TransitionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "غير مصرح." };
  const resolved = await resolveDbUserOrError(session);
  if (!resolved.ok) return { ok: false, message: resolved.message };
  const { dbUserId } = resolved;
  const cid = newClassificationId.trim();
  if (!cid) return { ok: false, message: "اختر تصنيفاً." };
  if (!(await ensureCanEditClient(session, dbUserId, clientId)))
    return { ok: false, message: "لا يمكنك تنفيذ هذا الإجراء." };

  const cls = await prisma.clientClassification.findUnique({
    where: { id: cid },
  });
  if (!cls) return { ok: false, message: "تصنيف غير موجود." };
  if (cls.isBRow)
    return { ok: false, message: "اختر تصنيفاً غير مسار B." };

  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return { ok: false, message: "العميل غير موجود." };

    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: clientId },
        data: {
          status: ClientStatus.NOT_B,
          classificationId: cid,
          notBClassification: cid,
        },
      });
      await tx.clientStatusChange.create({
        data: {
          clientId,
          fromStatus: client.status,
          toStatus: ClientStatus.NOT_B,
          note: `تصنيف: ${cls.label}`,
          changedById: dbUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: dbUserId,
          clientId,
          entity: "Client",
          entityId: clientId,
          action: "MOVE_NOT_B_FROM_REPORT_B",
          kind: "STATUS_CHANGE",
          summary: `نقل إلى Not B — ${cls.label}`,
          meta: {
            classificationId: cid,
            label: cls.label,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    });

    revalidatePath("/reports/b");
    revalidatePath("/reports/not-b");
    revalidatePath("/dashboard");
    revalidatePath("/clients");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "فشل النقل." };
  }
}

/** تم البيع من التقرير */
export async function markClientSoldFromReport(
  clientId: string,
  saleValue: string,
  saleDateIso: string
): Promise<TransitionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "غير مصرح." };
  const resolved = await resolveDbUserOrError(session);
  if (!resolved.ok) return { ok: false, message: resolved.message };
  const { dbUserId } = resolved;
  const cv = parseSaleDecimal(saleValue);
  const sd = new Date(saleDateIso);
  if (!cv)
    return { ok: false, message: "أدخل قيمة بيع صالحة." };
  if (Number.isNaN(sd.getTime()))
    return { ok: false, message: "تاريخ البيع غير صالح." };
  if (!(await ensureCanEditClient(session, dbUserId, clientId)))
    return { ok: false, message: "لا يمكنك تنفيذ هذا الإجراء." };

  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return { ok: false, message: "العميل غير موجود." };

    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: clientId },
        data: {
          status: ClientStatus.WON,
          contractValue: cv,
          saleDate: sd,
          lossReason: null,
          closedLostAt: null,
        },
      });
      await tx.clientStatusChange.create({
        data: {
          clientId,
          fromStatus: client.status,
          toStatus: ClientStatus.WON,
          note: `قيمة: ${saleValue}`,
          changedById: dbUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: dbUserId,
          clientId,
          entity: "Client",
          entityId: clientId,
          action: "WON_FROM_REPORT_B",
          kind: "STATUS_CHANGE",
          summary: `تم البيع من تقرير B`,
          meta: {
            saleValue,
            saleDate: saleDateIso,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    });

    revalidatePath("/reports/b");
    revalidatePath("/reports/won");
    revalidatePath("/dashboard");
    revalidatePath("/clients");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "فشل التسجيل." };
  }
}
