"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth-helpers";
import type { ClassificationRow } from "@/lib/data/classifications";
import { sanitizeDisplayLabel } from "@/lib/display-text";
import { prisma } from "@/lib/prisma";
import { resolvePipelineFields } from "@/lib/pipeline-choice";
import {
  buildAddClientFormSchema,
  extractCustomFieldsPayload,
} from "@/lib/validations/add-client";
export type CreateClientResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

function parseOptionalDate(isoOrLocal: string | undefined): Date | null {
  if (!isoOrLocal) return null;
  const d = new Date(isoOrLocal);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseRequiredNextFollow(
  isoOrLocal: string | undefined
): Date | null {
  return parseOptionalDate(isoOrLocal);
}

function parseOptionalDecimal(
  v: string | undefined
): Prisma.Decimal | null {
  if (!v || v === "") return null;
  try {
    return new Prisma.Decimal(v);
  } catch {
    return null;
  }
}

export async function createClientAction(raw: unknown): Promise<CreateClientResult> {
  const session = await getSessionUser();
  if (!session) {
    return { ok: false, message: "يرجى تسجيل الدخول." };
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
    label: sanitizeDisplayLabel(r.label),
    color: r.color,
    sortOrder: r.sortOrder,
    isBRow: r.isBRow,
  }));

  const schema = buildAddClientFormSchema(definitions, classifications);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      Object.values(first).flat()[0] ?? "تعذر التحقق من البيانات المدخلة";
    return { ok: false, message: msg };
  }

  const data = parsed.data;
  const customJson = extractCustomFieldsPayload(
    data as unknown as Record<string, unknown>,
    definitions
  );

  const nextAt = parseRequiredNextFollow(data.nextFollowUpAt as string);
  if (!nextAt) {
    return { ok: false, message: "تاريخ المتابعة التالي غير صالح." };
  }

  let pipeline: {
    status: import("@prisma/client").ClientStatus;
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
    const client = await prisma.$transaction(async (tx) => {
      const c = await tx.client.create({
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
          initialCallDate: parseOptionalDate(
            data.initialCallDate as string | undefined
          ),
          nextFollowUpAt: nextAt,
          customFields: customJson as Prisma.InputJsonValue,
          assignedUserId: session.id,
        },
      });

      await tx.interaction.create({
        data: {
          clientId: c.id,
          interactionAt: new Date(),
          notes:
            (data.callSummary as string | undefined)?.trim() ||
            "أول تسجيل من نموذج إضافة عميل",
          followUpStatus: (data.salesNotes as string | undefined)?.slice(0, 180) ?? null,
          nextFollowUpAt: nextAt,
          createdById: session.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          clientId: c.id,
          entity: "Client",
          entityId: c.id,
          action: "CLIENT_CREATE",
          kind: "CLIENT_CREATE",
          summary: `إنشاء عميل: ${data.name}`,
        },
      });

      return c;
    });

    revalidatePath("/clients");
    revalidatePath("/clients/new");
    return { ok: true, id: client.id };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      message: "حدث خطأ أثناء الحفظ. تحقق من اتصال قاعدة البيانات.",
    };
  }
}
