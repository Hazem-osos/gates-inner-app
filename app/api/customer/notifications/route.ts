import { NextResponse } from "next/server";
import { NotificationRecipientType } from "@prisma/client";
import { z } from "zod";

import { apiCustomerUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cu = await apiCustomerUser();
  if (!cu) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  const notifications = await prisma.notification.findMany({
    where: {
      recipientType: NotificationRecipientType.CUSTOMER,
      recipientId: cu.id,
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const unreadCount = await prisma.notification.count({
    where: {
      recipientType: NotificationRecipientType.CUSTOMER,
      recipientId: cu.id,
      isRead: false,
    },
  });
  return NextResponse.json({ notifications, unreadCount });
}

const patchSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export async function PATCH(req: Request) {
  const cu = await apiCustomerUser();
  if (!cu) {
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
  await prisma.notification.updateMany({
    where: {
      id: { in: parsed.data.ids },
      recipientType: NotificationRecipientType.CUSTOMER,
      recipientId: cu.id,
    },
    data: { isRead: true },
  });
  return NextResponse.json({ ok: true });
}
