import { NextResponse } from "next/server";

import { getSessionUser, isManagerOrAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/** قائمة مندوبي المبيعات النشطين — لاستخدامها في فلاتر التقارير وسجل العمل (مدراء/أدمن فقط). */
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  if (!isManagerOrAdmin(session.role)) {
    return NextResponse.json({ users: [] as { id: string; name: string }[] });
  }

  const users = await prisma.user.findMany({
    where: { isActive: true, role: "SALES", deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}
