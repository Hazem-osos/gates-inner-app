import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  getSessionUser,
  isManagerOrAdmin,
  resolveSessionDbUserId,
} from "@/lib/auth-helpers";
import { canAccessClient } from "@/lib/report-scope";
import { prisma } from "@/lib/prisma";

/**
 * أول حفظ لصف «توصية من عمود تقرير B» قبل وجود صف في ManagementRecommendation.
 */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }

  const dbId = await resolveSessionDbUserId(session);
  if (!dbId) {
    return NextResponse.json(
      { message: "تعذر ربط حسابك بقاعدة البيانات." },
      { status: 403 }
    );
  }

  let body: {
    clientId?: string;
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

  const clientId = body.clientId?.trim();
  if (!clientId) {
    return NextResponse.json({ message: "معرّف العميل مطلوب." }, { status: 400 });
  }

  const text = (body.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ message: "نص التوصية مطلوب." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, assignedUserId: true },
  });
  if (!client) {
    return NextResponse.json({ message: "العميل غير موجود." }, { status: 404 });
  }

  if (
    !canAccessClient(session.role, dbId, client.assignedUserId ?? null) &&
    !isManagerOrAdmin(session.role)
  ) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
  }

  const targetUserId = client.assignedUserId ?? dbId;

  const recommendationDate =
    body.recommendationDate && body.recommendationDate.trim()
      ? new Date(body.recommendationDate)
      : null;
  const workDate =
    body.workDate && body.workDate.trim() ? new Date(body.workDate) : null;
  const actionTaken = body.actionTaken?.trim() ? body.actionTaken : null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: clientId },
        data: {
          managementRecommendationText: text,
          managementRecommendationDate: recommendationDate,
        },
      });
      await tx.managementRecommendation.create({
        data: {
          clientId,
          body: text,
          authorId: dbId,
          targetUserId,
          recommendationDate,
          workDate,
          actionTaken,
        },
      });
    });

    revalidatePath("/reports/recommendations");
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/dashboard");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "فشل الحفظ." }, { status: 500 });
  }
}
