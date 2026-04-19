"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function markAlertReadAction(alertId: string): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "يرجى تسجيل الدخول." };

  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!alert || alert.userId !== session.id) {
    return { ok: false, message: "غير مصرح." };
  }

  await prisma.alert.update({
    where: { id: alertId },
    data: { readAt: new Date() },
  });

  revalidatePath("/dashboard");
  if (alert.clientId) revalidatePath(`/clients/${alert.clientId}`);
  return { ok: true };
}
