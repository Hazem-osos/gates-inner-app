import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

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

  const { id: clientId } = await ctx.params;
  let body: { color?: string; reportType?: string; label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const color = (body.color ?? "").trim();
  const reportType = (body.reportType ?? "b").trim().toLowerCase();
  const legendNote = (body.label ?? "").trim() || null;

  if (!color) {
    return NextResponse.json({ message: "اللون مطلوب." }, { status: 400 });
  }

  const reportKey =
    reportType === "b"
      ? "report-b"
      : reportType === "not-b"
        ? "report-not-b"
        : `report-${reportType}`;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, assignedUserId: true },
  });
  if (!client) {
    return NextResponse.json({ message: "العميل غير موجود." }, { status: 404 });
  }

  const dbUserId = await resolveSessionDbUserId(session);
  if (!dbUserId) {
    return NextResponse.json(
      {
        message:
          "تعذر ربط حسابك بقاعدة البيانات. أعد تسجيل الدخول ثم جرّب التلوين مجدداً.",
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

  try {
    await prisma.reportRowStyle.upsert({
      where: {
        userId_reportKey_clientId: {
          userId: dbUserId,
          reportKey,
          clientId,
        },
      },
      create: {
        userId: dbUserId,
        reportKey,
        clientId,
        colorKey: color,
        legendNote,
      },
      update: {
        colorKey: color,
        legendNote,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: dbUserId,
        clientId,
        entity: "ReportRowStyle",
        entityId: clientId,
        action: "ROW_STYLE_SET",
        kind: "REPORT_ROW_STYLE",
        summary: `تلوين صف في ${reportKey}`,
        meta: { color, reportKey, legendNote } as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "فشل الحفظ." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }

  const { id: clientId } = await ctx.params;
  const { searchParams } = new URL(_req.url);
  const reportType = (searchParams.get("reportType") ?? "b").toLowerCase();
  const reportKey =
    reportType === "b"
      ? "report-b"
      : reportType === "not-b"
        ? "report-not-b"
        : `report-${reportType}`;

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

  try {
    await prisma.reportRowStyle.deleteMany({
      where: {
        userId: dbUserId,
        reportKey,
        clientId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: dbUserId,
        clientId,
        entity: "ReportRowStyle",
        entityId: clientId,
        action: "ROW_STYLE_CLEAR",
        kind: "REPORT_ROW_STYLE",
        summary: `إزالة تلوين صف من ${reportKey}`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "فشل الحذف." }, { status: 500 });
  }
}
