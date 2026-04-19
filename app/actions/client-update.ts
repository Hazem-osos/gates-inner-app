"use server";

import { ClientStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth-helpers";
import type { ClassificationRow } from "@/lib/data/classifications";
import { prisma } from "@/lib/prisma";
import { resolvePipelineFields } from "@/lib/pipeline-choice";
import {
  buildAddClientFormSchema,
  extractCustomFieldsPayload,
} from "@/lib/validations/add-client";

export type ActionResult = { ok: true } | { ok: false; message: string };

function parseOptionalDate(isoOrLocal: string | undefined): Date | null {
  if (!isoOrLocal) return null;
  const d = new Date(isoOrLocal);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseOptionalDecimal(v: string | undefined): Prisma.Decimal | null {
  if (!v || v === "") return null;
  try {
    return new Prisma.Decimal(v);
  } catch {
    return null;
  }
}

export async function updateClientAction(
  clientId: string,
  raw: unknown
): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "يرجى تسجيل الدخول." };

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, message: "العميل غير موجود." };
  if (
    session.role === "SALES" &&
    client.assignedUserId &&
    client.assignedUserId !== session.id
  ) {
    return { ok: false, message: "لا يمكنك تعديل هذا العميل." };
  }

  const [definitions, classificationRows] = await Promise.all([
    prisma.customFieldDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { labelAr: "asc" }],
    }),
    prisma.clientClassification.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
  ]);

  const classifications: ClassificationRow[] = classificationRows.map((r) => ({
    id: r.id,
    slug: r.slug,
    label: r.label,
    color: r.color,
    sortOrder: r.sortOrder,
    isBRow: r.isBRow,
  }));

  const schema = buildAddClientFormSchema(definitions, classifications);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "تحقق من البيانات";
    return { ok: false, message: msg };
  }

  const data = parsed.data;
  const customJson = extractCustomFieldsPayload(
    data as unknown as Record<string, unknown>,
    definitions
  );

  let pipeline: {
    status: ClientStatus;
    classificationId: string | null;
    notBClassification: string | null;
  };
  try {
    pipeline = resolvePipelineFields(
      data.pipelineChoice as string,
      data.classificationSubId as string | undefined,
      classifications
    );
  } catch {
    return { ok: false, message: "تصنيف العميل غير صالح." };
  }

  try {
    const nextAt = parseOptionalDate(data.nextFollowUpAt as string | undefined);
    if (!nextAt) {
      return { ok: false, message: "تاريخ المتابعة التالي مطلوب." };
    }

    await prisma.client.update({
      where: { id: clientId },
      data: {
        name: data.name,
        phone: data.phone,
        phone2: (data.phone2 as string | undefined)?.trim() || null,
        company: data.company || null,
        position: data.position || null,
        address: data.address || null,
        quotePrice: parseOptionalDecimal(data.quotePrice as string | undefined),
        quoteDetail: (data.quoteDetail as string | undefined)?.trim() || null,
        allowedDiscount: parseOptionalDecimal(
          data.allowedDiscount as string | undefined
        ),
        status: pipeline.status,
        classificationId: pipeline.classificationId,
        notBClassification: pipeline.notBClassification,
        sourceAdName: data.sourceAdName || null,
        adPlatform: (data.adPlatform as string | undefined)?.trim() || null,
        qqAnswer: data.qqAnswer === "yes",
        callSummary: (data.callSummary as string | undefined)?.trim() ?? "",
        salesNotes: (data.salesNotes as string | undefined)?.trim() ?? "",
        clientWarmingText:
          (data.clientWarmingText as string | undefined)?.trim() ?? "",
        visitAppointmentScheduled: Boolean(data.visitAppointmentScheduled),
        visitAppointmentDate: parseOptionalDate(
          data.visitAppointmentDate as string | undefined
        ),
        presentingEmployeeName:
          (data.presentingEmployeeName as string | undefined)?.trim() || null,
        contractValue: parseOptionalDecimal(
          data.contractValue as string | undefined
        ),
        saleDate: parseOptionalDate(data.saleDate as string | undefined),
        lossReason: data.lossReason || null,
        closedLostAt: parseOptionalDate(
          data.closedLostAt as string | undefined
        ),
        customFields: customJson as Prisma.InputJsonValue,
        initialCallDate: parseOptionalDate(
          data.initialCallDate as string | undefined
        ),
        nextFollowUpAt: nextAt,
      },
    });
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "فشل التحديث." };
  }
}

const statusSchema = z.object({
  clientId: z.string(),
  toStatus: z.nativeEnum(ClientStatus),
  contractValue: z.string().optional(),
  saleDate: z.string().optional(),
  lossReason: z.string().optional(),
  closedLostAt: z.string().optional(),
  note: z.string().optional(),
});

export async function changeClientStatusAction(
  raw: unknown
): Promise<ActionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "يرجى تسجيل الدخول." };

  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "بيانات غير صالحة." };
  }

  const { clientId, toStatus, contractValue, saleDate, lossReason, closedLostAt, note } =
    parsed.data;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, message: "العميل غير موجود." };
  if (
    session.role === "SALES" &&
    client.assignedUserId &&
    client.assignedUserId !== session.id
  ) {
    return { ok: false, message: "غير مصرح." };
  }

  if (toStatus === ClientStatus.WON) {
    const cv = parseOptionalDecimal(contractValue);
    const sd = parseOptionalDate(saleDate);
    if (!cv || !sd) {
      return {
        ok: false,
        message: "تم البيع يتطلب قيمة التعاقد وتاريخ البيع.",
      };
    }
  }
  if (toStatus === ClientStatus.LOST) {
    if (!lossReason?.trim() || !parseOptionalDate(closedLostAt)) {
      return {
        ok: false,
        message: "تم الإغلاق يتطلب سبب الإغلاق وتاريخ الإغلاق.",
      };
    }
  }

  const fromStatus = client.status;

  try {
    await prisma.$transaction(async (tx) => {
      const patch: Record<string, unknown> = { status: toStatus };
      if (toStatus === ClientStatus.NOT_B) {
        patch.notBClassification =
          client.notBClassification ?? "عميل U";
      }
      if (toStatus === ClientStatus.WON) {
        patch.contractValue = parseOptionalDecimal(contractValue);
        patch.saleDate = parseOptionalDate(saleDate);
        patch.lossReason = null;
        patch.closedLostAt = null;
      } else if (toStatus === ClientStatus.LOST) {
        patch.lossReason = lossReason ?? null;
        patch.closedLostAt = parseOptionalDate(closedLostAt);
        patch.contractValue = null;
        patch.saleDate = null;
      } else {
        patch.contractValue = null;
        patch.saleDate = null;
        patch.lossReason = null;
        patch.closedLostAt = null;
      }

      await tx.client.update({
        where: { id: clientId },
        data: patch as Prisma.ClientUpdateInput,
      });

      await tx.clientStatusChange.create({
        data: {
          clientId,
          fromStatus,
          toStatus,
          note: note || null,
          changedById: session.id,
        },
      });
    });

    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "فشل تغيير الحالة." };
  }
}
