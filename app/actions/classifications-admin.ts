"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser, isManagerOrAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type ClassificationAdminResult =
  | { ok: true }
  | { ok: false; message: string };

export async function upsertClassificationAction(raw: unknown): Promise<
  ClassificationAdminResult & { id?: string }
> {
  const session = await getSessionUser();
  if (!session || !isManagerOrAdmin(session.role)) {
    return { ok: false, message: "غير مصرح بتعديل التصنيفات." };
  }

  const data = raw as {
    id?: string;
    slug?: string;
    label?: string;
    color?: string;
    sortOrder?: number;
    isBRow?: boolean;
  };

  const label = (data.label ?? "").trim();
  const color = (data.color ?? "").trim();
  if (!label) return { ok: false, message: "اسم التصنيف مطلوب." };
  if (!color) return { ok: false, message: "اللون مطلوب." };

  try {
    if (data.id) {
      const updated = await prisma.clientClassification.update({
        where: { id: data.id },
        data: {
          label,
          color,
          sortOrder: data.sortOrder ?? 0,
          isBRow: Boolean(data.isBRow),
        },
      });
      revalidatePath("/settings/field-labels");
      revalidatePath("/clients/new");
      revalidatePath("/clients");
      return { ok: true, id: updated.id };
    }

    const slugBase =
      (data.slug ?? "").trim() ||
      `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const created = await prisma.clientClassification.create({
      data: {
        slug: slugBase,
        label,
        color,
        sortOrder: data.sortOrder ?? 99,
        isBRow: Boolean(data.isBRow),
      },
    });
    revalidatePath("/settings/field-labels");
    revalidatePath("/clients/new");
    return { ok: true, id: created.id };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "تعذر حفظ التصنيف." };
  }
}

export async function deleteClassificationAction(
  id: string
): Promise<ClassificationAdminResult> {
  const session = await getSessionUser();
  if (!session || !isManagerOrAdmin(session.role)) {
    return { ok: false, message: "غير مصرح." };
  }

  const usedCount = await prisma.client.count({
    where: {
      OR: [{ classificationId: id }, { notBClassification: id }],
    },
  });

  if (usedCount > 0) {
    return {
      ok: false,
      message: `لا يمكن حذف التصنيف: يُستخدم حالياً مع ${usedCount} عميل/عملاء.`,
    };
  }

  try {
    await prisma.clientClassification.delete({ where: { id } });
    revalidatePath("/settings/field-labels");
    revalidatePath("/clients/new");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "تعذر حذف التصنيف." };
  }
}
