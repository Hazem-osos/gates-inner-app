"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type AdminUserLifecycleResult =
  | { ok: true }
  | { ok: false; message: string };

const userIdSchema = z.object({ userId: z.string().min(1) });

function revalidate() {
  revalidatePath("/settings/users");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/clients", "page");
  revalidatePath("/reports", "layout");
}

/** المسؤولون النشطون غير المحذوفين */
async function countActiveAdmins(): Promise<number> {
  return prisma.user.count({
    where: {
      role: "ADMIN",
      isActive: true,
      deletedAt: null,
    },
  });
}

/**
 * تفعيل/تعطيل حساب (بدون حذف). المستخدمون المحذوفون ناعماً يُعاد تفعيلهم فقط عبر «استعادة».
 */
export async function adminSetUserActiveAction(
  raw: unknown
): Promise<AdminUserLifecycleResult> {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return { ok: false, message: "غير مصرح — للمسؤول فقط." };
  }

  const schema = z.object({
    userId: z.string().min(1),
    isActive: z.boolean(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "بيانات غير صالحة." };
  }

  const { userId, isActive } = parsed.data;
  if (userId === session.id && !isActive) {
    return { ok: false, message: "لا يمكنك تعطيل حسابك أنت." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, deletedAt: true },
  });
  if (!target) {
    return { ok: false, message: "المستخدم غير موجود." };
  }
  if (target.deletedAt) {
    return {
      ok: false,
      message: "مستخدم محذوف — استخدم «استعادة» ثم فعّل إن لزم.",
    };
  }

  if (target.role === "ADMIN" && !isActive) {
    const n = await countActiveAdmins();
    if (n <= 1) {
      return { ok: false, message: "لا يمكن تعطيل آخر مسؤول نشط." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  revalidate();
  return { ok: true };
}

/**
 * حذف ناعم: يتوقف الدخول ويظهر «مستخدم محذوف» في السجلات، دون فقدان الارتباطات.
 */
export async function adminSoftDeleteUserAction(
  raw: unknown
): Promise<AdminUserLifecycleResult> {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return { ok: false, message: "غير مصرح — للمسؤول فقط." };
  }

  const parsed = userIdSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "بيانات غير صالحة." };
  }

  const { userId } = parsed.data;
  if (userId === session.id) {
    return { ok: false, message: "لا يمكنك حذف حسابك أنت." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, deletedAt: true },
  });
  if (!target) {
    return { ok: false, message: "المستخدم غير موجود." };
  }
  if (target.deletedAt) {
    return { ok: false, message: "الحساب محذوف مسبقاً." };
  }
  if (target.role === "ADMIN") {
    const n = await countActiveAdmins();
    if (n <= 1) {
      return { ok: false, message: "لا يمكن حذف آخر مسؤول نشط." };
    }
  }

  const now = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: now, isActive: false },
  });

  revalidate();
  return { ok: true };
}

/** إلغاء الحذف الناعم وإمكانية إعادة التفعيل */
export async function adminRestoreUserAction(
  raw: unknown
): Promise<AdminUserLifecycleResult> {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return { ok: false, message: "غير مصرح — للمسؤول فقط." };
  }

  const parsed = z
    .object({
      userId: z.string().min(1),
      isActive: z.boolean().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "بيانات غير صالحة." };
  }

  const { userId, isActive = true } = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, deletedAt: true },
  });
  if (!target) {
    return { ok: false, message: "المستخدم غير موجود." };
  }
  if (!target.deletedAt) {
    return { ok: false, message: "الحساب ليس محذوفاً." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: null, isActive },
  });

  revalidate();
  return { ok: true };
}
