import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { canAccessClient } from "@/lib/report-scope";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ clientId: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  const dbUserId = await resolveSessionDbUserId(session);
  if (!dbUserId) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }

  const { clientId } = await ctx.params;
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, assignedUserId: true },
  });
  if (!client) {
    return NextResponse.json({ message: "العميل غير موجود." }, { status: 404 });
  }

  if (
    !canAccessClient(session.role, dbUserId, client.assignedUserId ?? null)
  ) {
    return NextResponse.json(
      { message: "غير مصرح بالوصول إلى بيانات هذا العميل." },
      { status: 403 }
    );
  }

  let payload: {
    day1Done?: boolean;
    day2Done?: boolean;
    day3Done?: boolean;
    clientWarmingText?: string | null;
    day2Content?: string | null;
    day3Content?: string | null;
  };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "بيانات غير صالحة." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (payload.clientWarmingText !== undefined) {
        await tx.client.update({
          where: { id: clientId },
          data: {
            clientWarmingText: payload.clientWarmingText?.trim()
              ? payload.clientWarmingText
              : null,
          },
        });
      }

      const warmingBody =
        payload.day1Done !== undefined ||
        payload.day2Done !== undefined ||
        payload.day3Done !== undefined ||
        payload.day2Content !== undefined ||
        payload.day3Content !== undefined;

      if (warmingBody) {
        let w = await tx.warmingToolSent.findFirst({
          where: { clientId },
          orderBy: { createdAt: "desc" },
        });
        if (!w) {
          w = await tx.warmingToolSent.create({
            data: { clientId },
          });
        }
        await tx.warmingToolSent.update({
          where: { id: w.id },
          data: {
            ...(payload.day1Done !== undefined
              ? { day1Done: payload.day1Done }
              : {}),
            ...(payload.day2Done !== undefined
              ? { day2Done: payload.day2Done }
              : {}),
            ...(payload.day3Done !== undefined
              ? { day3Done: payload.day3Done }
              : {}),
            ...(payload.day2Content !== undefined
              ? {
                  day2Content: payload.day2Content?.trim()
                    ? payload.day2Content
                    : null,
                }
              : {}),
            ...(payload.day3Content !== undefined
              ? {
                  day3Content: payload.day3Content?.trim()
                    ? payload.day3Content
                    : null,
                }
              : {}),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: dbUserId,
          clientId,
          entity: "WarmingToolSent",
          entityId: clientId,
          kind: "WARMING_PATCH",
          action: "PATCH",
          summary: "تحديث أدوات الـ Warming",
          meta: payload as object,
        },
      });
    });

    revalidatePath("/reports/warming");
    revalidatePath("/warming");
    revalidatePath(`/clients/${clientId}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "فشل الحفظ." }, { status: 500 });
  }
}
