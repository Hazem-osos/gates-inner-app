import { NextResponse } from "next/server";
import {
  NotificationRecipientType,
  SupportRole,
} from "@prisma/client";
import { z } from "zod";

import { apiSupportUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

function recipientTypeForRole(role: SupportRole): NotificationRecipientType {
  return role === "ADMIN"
    ? NotificationRecipientType.ADMIN
    : NotificationRecipientType.AGENT;
}

export async function GET() {
  const su = await apiSupportUser();
  if (!su) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  const recipientType = recipientTypeForRole(su.supportRole);
  const notifications = await prisma.notification.findMany({
    where: { recipientType, recipientId: su.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({
    where: { recipientType, recipientId: su.id, isRead: false },
  });
  return NextResponse.json({ notifications, unreadCount });
}

const patchSchema = z.object({
  ids: z.array(z.string()).min(1),
  isRead: z.boolean(),
});

export async function PATCH(req: Request) {
  const su = await apiSupportUser();
  if (!su) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ message: "طلب غير صالح." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: "بيانات غير صالحة." }, { status: 400 });
  }
  const recipientType = recipientTypeForRole(su.supportRole);
  await prisma.notification.updateMany({
    where: {
      id: { in: parsed.data.ids },
      recipientType,
      recipientId: su.id,
    },
    data: { isRead: parsed.data.isRead },
  });
  return NextResponse.json({ ok: true });
}
