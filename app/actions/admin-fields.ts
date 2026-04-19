"use server";

import { CustomFieldValueType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: true } | { ok: false; message: string };

async function gateAdmin(): Promise<
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>> }
  | { ok: false; message: string }
> {
  const s = await getSessionUser();
  if (!s) return { ok: false, message: "يرجى تسجيل الدخول." };
  if (!isAdmin(s.role)) return { ok: false, message: "للمسؤول فقط." };
  return { ok: true, user: s };
}

const customSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, "المفتاح لاتيني صغير وأرقام وشرطة سفلية فقط"),
  labelAr: z.string().min(1),
  valueType: z.nativeEnum(CustomFieldValueType),
  optionsJson: z.string().optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function upsertCustomFieldDefinitionAction(
  raw: unknown,
  id?: string
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return gate;

  const parsed = customSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "تحقق من الحقول." };
  }

  const { key, labelAr, valueType, optionsJson, isRequired, sortOrder, isActive } =
    parsed.data;

  let options: unknown = undefined;
  if (optionsJson?.trim()) {
    try {
      options = JSON.parse(optionsJson) as unknown;
    } catch {
      return { ok: false, message: "JSON الخيارات غير صالح." };
    }
  }

  try {
    if (id) {
      await prisma.customFieldDefinition.update({
        where: { id },
        data: {
          key,
          labelAr,
          valueType,
          options:
            options === undefined || options === null
              ? undefined
              : (options as Prisma.InputJsonValue),
          isRequired: isRequired ?? false,
          sortOrder: sortOrder ?? 0,
          isActive: isActive ?? true,
        },
      });
    } else {
      await prisma.customFieldDefinition.create({
        data: {
          key,
          labelAr,
          valueType,
          options:
            options === undefined || options === null
              ? undefined
              : (options as Prisma.InputJsonValue),
          isRequired: isRequired ?? false,
          sortOrder: sortOrder ?? 0,
          isActive: isActive ?? true,
        },
      });
    }
    revalidatePath("/admin/custom-fields");
    revalidatePath("/clients/new");
    return { ok: true };
  } catch {
    return { ok: false, message: "المفتاح قد يكون مكرراً أو خطأ في الحفظ." };
  }
}

export async function deleteCustomFieldDefinitionAction(
  id: string
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return gate;
  try {
    await prisma.customFieldDefinition.delete({ where: { id } });
    revalidatePath("/admin/custom-fields");
    return { ok: true };
  } catch {
    return { ok: false, message: "تعذر الحذف." };
  }
}

const coreSchema = z.object({
  id: z.string().min(1),
  labelAr: z.string().min(1),
  visible: z.boolean(),
  sortOrder: z.number().int(),
});

export async function updateCoreFieldLabelAction(
  raw: unknown
): Promise<ActionResult> {
  const gate = await gateAdmin();
  if (!gate.ok) return gate;

  const parsed = coreSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "بيانات غير صالحة." };

  await prisma.coreFieldLabel.update({
    where: { id: parsed.data.id },
    data: {
      labelAr: parsed.data.labelAr,
      visible: parsed.data.visible,
      sortOrder: parsed.data.sortOrder,
    },
  });
  revalidatePath("/admin/core-labels");
  revalidatePath("/clients/new");
  revalidatePath("/clients", "layout");
  return { ok: true };
}
