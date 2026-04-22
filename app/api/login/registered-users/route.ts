import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * قائمة موظفين للمساعدة على شاشة الدخول (تعبئة البريد).
 * يعمل عند `ALLOW_OPEN_REGISTRATION=true` أو `ALLOW_LOGIN_EMPLOYEE_PICKER=true`.
 */
export async function GET() {
  const allowed =
    process.env.ALLOW_OPEN_REGISTRATION === "true" ||
    process.env.ALLOW_LOGIN_EMPLOYEE_PICKER === "true";
  if (!allowed) {
    return NextResponse.json({ message: "غير متاح." }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });
    return NextResponse.json({ users });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "فشل الجلب." }, { status: 500 });
  }
}
