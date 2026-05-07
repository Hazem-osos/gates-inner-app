import { NextResponse } from "next/server";

import { getSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { userDisplayName } from "@/lib/user-display-name";

/**
 * متابعات مسجّلة من شاشة العميل (نموذج المتابعة) — للعرض في ملخص تقرير B / Not B.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }

  const { id: clientId } = await ctx.params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { assignedUserId: true },
  });
  if (!client) {
    return NextResponse.json({ message: "العميل غير موجود." }, { status: 404 });
  }

  const dbUserId = await resolveSessionDbUserId(session);
  if (!dbUserId) {
    return NextResponse.json(
      {
        message:
          "تعذر ربط حسابك بقاعدة البيانات. أعد تسجيل الدخول ثم جرّب مجدداً.",
      },
      { status: 401 }
    );
  }

  if (
    session.role === "SALES" &&
    client.assignedUserId &&
    client.assignedUserId !== dbUserId
  ) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
  }

  const rows = await prisma.interaction.findMany({
    where: { clientId },
    orderBy: [{ interactionAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      interactionAt: true,
      notes: true,
      followUpStatus: true,
      createdBy: {
        select: { name: true, deletedAt: true },
      },
    },
  });

  const items = rows.map((r) => ({
    id: r.id,
    interactionAt: r.interactionAt.toISOString(),
    notes: r.notes,
    followUpStatus: r.followUpStatus,
    authorName: userDisplayName(r.createdBy),
  }));

  return NextResponse.json({ items });
}
