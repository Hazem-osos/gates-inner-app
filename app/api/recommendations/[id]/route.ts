import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const rec = await prisma.managementRecommendation.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, assignedUserId: true } },
    },
  });
  if (!rec) {
    return NextResponse.json({ message: "التوصية غير موجودة." }, { status: 404 });
  }

  if (session.role === "SALES") {
    const dbId = (await resolveSessionDbUserId(session)) ?? session.id;
    if (rec.targetUserId !== dbId) {
      return NextResponse.json(
        { message: "غير مصرح — التوصية ليست موجهة لحسابك." },
        { status: 403 }
      );
    }
  }

  let body: {
    body?: string;
    recommendationDate?: string | null;
    workDate?: string | null;
    actionTaken?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "بيانات غير صالحة." }, { status: 400 });
  }

  const data: {
    body?: string;
    recommendationDate?: Date | null;
    workDate?: Date | null;
    actionTaken?: string | null;
  } = {};

  if (typeof body.body === "string") data.body = body.body;
  if (body.recommendationDate !== undefined) {
    data.recommendationDate =
      body.recommendationDate && body.recommendationDate.trim()
        ? new Date(body.recommendationDate)
        : null;
  }
  if (body.workDate !== undefined) {
    data.workDate =
      body.workDate && body.workDate.trim()
        ? new Date(body.workDate)
        : null;
  }
  if (body.actionTaken !== undefined) {
    data.actionTaken = body.actionTaken?.trim() ? body.actionTaken : null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.managementRecommendation.update({
        where: { id },
        data,
      });
      await tx.auditLog.create({
        data: {
          userId: session.id,
          clientId: rec.clientId,
          entity: "ManagementRecommendation",
          entityId: id,
          kind: "RECOMMENDATION_REPORT_PATCH",
          action: "PATCH",
          summary: "تحديث توصية إدارية من التقرير",
          meta: { ...(data as object), reportKey: "report-recommendations" },
        },
      });
    });
    revalidatePath("/reports/recommendations");
    revalidatePath(`/clients/${rec.clientId}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "فشل الحفظ." }, { status: 500 });
  }
}
