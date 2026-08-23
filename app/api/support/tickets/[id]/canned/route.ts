import { NextResponse } from "next/server";
import { z } from "zod";

import { notifyCustomer } from "@/lib/helpdesk/notifications";
import { apiSupportUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  cannedMessageId: z.string().min(1),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const su = await apiSupportUser();
  if (!su) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  const { id: ticketId } = await ctx.params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ message: "طلب غير صالح." }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: "رسالة غير صالحة." }, { status: 400 });
  }
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { customer: true },
  });
  if (!ticket) {
    return NextResponse.json({ message: "التذكرة غير موجودة." }, { status: 404 });
  }
  if (ticket.status === "CLOSED") {
    return NextResponse.json({ message: "التذكرة مغلقة." }, { status: 400 });
  }
  const canned = await prisma.cannedMessage.findFirst({
    where: { id: parsed.data.cannedMessageId, isActive: true },
  });
  if (!canned) {
    return NextResponse.json({ message: "الرسالة الجاهزة غير موجودة." }, { status: 404 });
  }
  await notifyCustomer({
    customerId: ticket.customerId,
    ticketId,
    title: canned.title,
    message: canned.content,
  });
  return NextResponse.json({ ok: true });
}
