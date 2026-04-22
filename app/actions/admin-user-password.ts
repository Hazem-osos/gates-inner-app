"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type AdminPasswordResult =
  | { ok: true }
  | { ok: false; message: string };

const schema = z
  .object({
    userId: z.string().min(1, "معرّف المستخدم مطلوب."),
    newPassword: z
      .string()
      .min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف."),
    confirmPassword: z.string().min(1, "أكّد كلمة المرور."),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "تأكيد كلمة المرور غير متطابق.",
    path: ["confirmPassword"],
  });

/** تغيير كلمة مرور أي مستخدم — للمسؤول فقط (مثلاً بعد انصراف موظف). */
export async function adminSetUserPasswordAction(
  raw: unknown
): Promise<AdminPasswordResult> {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return { ok: false, message: "غير مصرح — للمسؤول فقط." };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.confirmPassword?.[0] ??
      parsed.error.flatten().fieldErrors.newPassword?.[0] ??
      parsed.error.issues[0]?.message ??
      "بيانات غير صالحة.";
    return { ok: false, message: msg };
  }

  const { userId, newPassword } = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, deletedAt: true },
  });
  if (!target) {
    return { ok: false, message: "المستخدم غير موجود." };
  }
  if (target.deletedAt) {
    return { ok: false, message: "لا يمكن تغيير كلمة مرور مستخدم محذوف — استعِد الحساب أولاً." };
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash },
  });

  revalidatePath("/settings/users");
  return { ok: true };
}
