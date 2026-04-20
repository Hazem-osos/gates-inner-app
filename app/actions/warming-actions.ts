"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth-helpers";
import { parseOptionalDate } from "@/lib/date-parse";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: true } | { ok: false; message: string };

const schema = z.object({
  clientId: z.string().min(1),
  communicatedAt: z.string().optional(),
  activitySnapshot: z.string().optional(),
  day1Content: z.string().optional(),
  day2Content: z.string().optional(),
  day3Content: z.string().optional(),
  notes: z.string().optional(),
});

export async function createWarmingSentAction(
  raw: unknown
): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "يرجى تسجيل الدخول." };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "بيانات غير صالحة." };

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
  });
  if (!client) return { ok: false, message: "العميل غير موجود." };
  if (
    session.role === "SALES" &&
    client.assignedUserId &&
    client.assignedUserId !== session.id
  ) {
    return { ok: false, message: "غير مصرح." };
  }

  const d = parsed.data;
  try {
    await prisma.warmingToolSent.create({
      data: {
        clientId: d.clientId,
        communicatedAt: parseOptionalDate(d.communicatedAt),
        activitySnapshot: d.activitySnapshot || null,
        day1Content: d.day1Content || null,
        day2Content: d.day2Content || null,
        day3Content: d.day3Content || null,
        notes: d.notes || null,
      },
    });
    revalidatePath(`/clients/${d.clientId}`);
    revalidatePath("/warming");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "فشل الحفظ." };
  }
}
