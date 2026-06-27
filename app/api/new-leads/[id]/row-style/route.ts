import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  normalizeReportRowStyleColor,
  REPORT_NEW_LEADS_ROW_STYLE_KEY,
} from "@/lib/report-row-style-ui";

const REPORT_KEY = REPORT_NEW_LEADS_ROW_STYLE_KEY;

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }

  const { id: newLeadId } = await ctx.params;
  let body: { color?: string; label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "جسم الطلب غير صالح." }, { status: 400 });
  }

  const colorRaw = (body.color ?? "").trim();
  const color = normalizeReportRowStyleColor(colorRaw);
  const legendNote = (body.label ?? "").trim() || null;

  if (!color) {
    return NextResponse.json({ message: "اللون غير صالح." }, { status: 400 });
  }

  const lead = await prisma.newLead.findUnique({
    where: { id: newLeadId },
    select: { id: true },
  });
  if (!lead) {
    return NextResponse.json({ message: "الليد غير موجود." }, { status: 404 });
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

  try {
    await prisma.reportRowStyle.upsert({
      where: {
        reportKey_newLeadId: {
          reportKey: REPORT_KEY,
          newLeadId,
        },
      },
      create: {
        userId: dbUserId,
        reportKey: REPORT_KEY,
        newLeadId,
        colorKey: color,
        legendNote,
      },
      update: {
        colorKey: color,
        legendNote,
        userId: dbUserId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: dbUserId,
        entity: "ReportRowStyle",
        entityId: newLeadId,
        action: "ROW_STYLE_SET",
        kind: "REPORT_ROW_STYLE",
        summary: `تلوين صف في ${REPORT_KEY}`,
        meta: {
          color,
          reportKey: REPORT_KEY,
          legendNote,
          newLeadId,
        } as unknown as Prisma.InputJsonValue,
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

  const { id: newLeadId } = await ctx.params;

  const lead = await prisma.newLead.findUnique({
    where: { id: newLeadId },
    select: { id: true },
  });
  if (!lead) {
    return NextResponse.json({ message: "الليد غير موجود." }, { status: 404 });
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

  try {
    await prisma.reportRowStyle.deleteMany({
      where: {
        reportKey: REPORT_KEY,
        newLeadId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: dbUserId,
        entity: "ReportRowStyle",
        entityId: newLeadId,
        action: "ROW_STYLE_CLEAR",
        kind: "REPORT_ROW_STYLE",
        summary: `إزالة تلوين صف من ${REPORT_KEY}`,
        meta: { reportKey: REPORT_KEY, newLeadId } as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "فشل الحذف." }, { status: 500 });
  }
}
