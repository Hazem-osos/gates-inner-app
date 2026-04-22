"use server";

import { AlertType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getSessionUser,
  isManagerOrAdmin,
  resolveSessionDbUserId,
} from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: true } | { ok: false; message: string };

const schema = z.object({
  clientId: z.string().min(1),
  body: z.string().min(1, "نص التوصية مطلوب"),
  targetUserId: z.string().min(1, "اختر المندوب المستهدف"),
});

export async function createRecommendationAction(
  raw: unknown
): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "يرجى تسجيل الدخول." };
  if (!isManagerOrAdmin(session.role)) {
    return { ok: false, message: "غير مصرح بإضافة توصيات." };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "تحقق من الحقول." };
  }

  const { clientId, body, targetUserId } = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, message: "العميل غير موجود." };

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!target) {
    return { ok: false, message: "المستخدم المستهدف غير موجود." };
  }
  if (target.deletedAt || !target.isActive) {
    return { ok: false, message: "لا يمكن توجيه التوصية إلى حساب موقوف أو محذوف." };
  }
  if (target.role !== "SALES") {
    return { ok: false, message: "الهدف يجب أن يكون مندوب مبيعات." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const rec = await tx.managementRecommendation.create({
        data: {
          clientId,
          body,
          authorId: session.id,
          targetUserId,
        },
      });

      await tx.alert.create({
        data: {
          userId: targetUserId,
          type: AlertType.MANAGEMENT_RECOMMENDATION,
          title: "توصية إدارة",
          message: body.slice(0, 500),
          clientId,
          recommendationId: rec.id,
        },
      });
    });

    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/dashboard");
    revalidatePath("/reports/recommendations");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "فشل حفظ التوصية." };
  }
}

export async function acknowledgeRecommendationAction(
  recommendationId: string
): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "يرجى تسجيل الدخول." };

  const rec = await prisma.managementRecommendation.findUnique({
    where: { id: recommendationId },
  });
  const dbId = (await resolveSessionDbUserId(session)) ?? session.id;
  if (!rec || rec.targetUserId !== dbId) {
    return { ok: false, message: "غير مصرح." };
  }

  await prisma.managementRecommendation.update({
    where: { id: recommendationId },
    data: { acknowledgedAt: new Date() },
  });

  revalidatePath(`/clients/${rec.clientId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports/recommendations");
  return { ok: true };
}
