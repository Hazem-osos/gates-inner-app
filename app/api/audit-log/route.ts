import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/** سجل عمل المستخدم الحالي على العملاء ضمن نطاق تواريخ */
export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get("userId") ?? session.id;
  if (userIdParam !== session.id && session.role !== "ADMIN" && session.role !== "MANAGER") {
    return NextResponse.json({ message: "غير مصرح بعرض سجل مستخدم آخر." }, { status: 403 });
  }

  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  if (!fromStr || !toStr) {
    return NextResponse.json(
      { message: "معاملات من تاريخ وإلى تاريخ مطلوبة." },
      { status: 400 }
    );
  }

  const from = new Date(fromStr);
  const to = new Date(toStr);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ message: "تواريخ غير صالحة." }, { status: 400 });
  }

  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId: userIdParam,
        clientId: { not: null },
        createdAt: { gte: from, lte: end },
      },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const rows = logs.map((l) => ({
      id: l.id,
      clientName: l.client?.name ?? "—",
      phone: l.client?.phone ?? "—",
      action: l.action ?? l.kind,
      summary: l.summary,
      meta: l.meta,
      createdAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({ rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "فشل الجلب." }, { status: 500 });
  }
}
