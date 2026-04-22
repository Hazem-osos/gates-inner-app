"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type TransferResult = { ok: true } | { ok: false; message: string };

export async function transferClientToSalesAction(
  clientId: string,
  toUserId: string
): Promise<TransferResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "غير مصرح." };
  if (session.role !== "ADMIN" && session.role !== "MANAGER") {
    return { ok: false, message: "غير مصرح بنقل العملاء." };
  }

  const target = await prisma.user.findFirst({
    where: {
      id: toUserId,
      isActive: true,
      role: "SALES",
      deletedAt: null,
    },
  });
  if (!target) return { ok: false, message: "المستخدم غير موجود أو ليس سيلز." };

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, message: "العميل غير موجود." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: clientId },
        data: { assignedUserId: toUserId },
      });
      await tx.clientTransfer.create({
        data: {
          clientId,
          fromUserId: client.assignedUserId,
          toUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: session.id,
          clientId,
          entity: "Client",
          entityId: clientId,
          kind: "TRANSFER_SALES",
          action: "MOVE_SALES",
          summary: `نقل عميل إلى ${target.name}`,
          meta: {
            fromUserId: client.assignedUserId,
            toUserId,
            reportKey: "report-transferred",
          } as object,
        },
      });
    });
    revalidatePath("/clients");
    revalidatePath("/reports/transferred");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "فشل النقل." };
  }
}

export async function acknowledgeTransferredClientAction(
  transferId: string
): Promise<TransferResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "غير مصرح." };

  const t = await prisma.clientTransfer.findUnique({
    where: { id: transferId },
  });
  if (!t || t.toUserId !== session.id) {
    return { ok: false, message: "غير مصرح." };
  }

  await prisma.clientTransfer.update({
    where: { id: transferId },
    data: { acknowledgedAt: new Date() },
  });
  revalidatePath("/reports/transferred");
  return { ok: true };
}
