"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth-helpers";
import { parseOptionalDate } from "@/lib/date-parse";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  clientId: z.string().min(1),
  interactionAt: z.string().min(1, "تاريخ الاتصال مطلوب"),
  notes: z.string().min(1, "الملخص / الملاحظات مطلوبة"),
  followUpStatus: z.string().optional(),
  nextFollowUpAt: z.string().min(1, "تاريخ المتابعة التالي إجباري"),
});

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function logInteractionAction(
  raw: unknown
): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "يرجى تسجيل الدخول." };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.flatten().fieldErrors.nextFollowUpAt?.[0] ?? "بيانات غير صالحة",
    };
  }

  const { clientId, interactionAt, notes, followUpStatus, nextFollowUpAt } =
    parsed.data;
  const at = parseOptionalDate(interactionAt);
  const nextAt = parseOptionalDate(nextFollowUpAt);
  if (!at || !nextAt) {
    return { ok: false, message: "صيغة التاريخ غير صالحة." };
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, message: "العميل غير موجود." };

  if (
    session.role === "SALES" &&
    client.assignedUserId &&
    client.assignedUserId !== session.id
  ) {
    return { ok: false, message: "لا يمكنك تسجيل متابعة لهذا العميل." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const interaction = await tx.interaction.create({
        data: {
          clientId,
          interactionAt: at,
          notes,
          followUpStatus: followUpStatus || null,
          nextFollowUpAt: nextAt,
          createdById: session.id,
        },
      });

      await tx.client.update({
        where: { id: clientId },
        data: {
          nextFollowUpAt: nextAt,
          initialCallDate: client.initialCallDate ?? at,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          clientId,
          entity: "Interaction",
          entityId: interaction.id,
          action: "INTERACTION_LOG",
          kind: "INTERACTION_LOG",
          summary: `متابعة للعميل «${client.name}»`,
          meta: {
            interactionId: interaction.id,
            interactionAt: at.toISOString(),
            nextFollowUpAt: nextAt.toISOString(),
            notesPreview: notes.slice(0, 200),
          } as Prisma.InputJsonValue,
        },
      });
    });

    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "فشل حفظ المتابعة." };
  }
}
