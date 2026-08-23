import { NextResponse } from "next/server";
import { z } from "zod";

import { apiCustomerUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(4000).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const cu = await apiCustomerUser();
  if (!cu) {
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
    return NextResponse.json({ message: "التقييم غير صالح." }, { status: 400 });
  }
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, customerId: cu.id },
    include: { feedback: true },
  });
  if (!ticket) {
    return NextResponse.json({ message: "التذكرة غير موجودة." }, { status: 404 });
  }
  if (ticket.status !== "CLOSED") {
    return NextResponse.json(
      { message: "التقييم متاح بعد إغلاق التذكرة." },
      { status: 400 }
    );
  }
  if (ticket.feedback) {
    return NextResponse.json({ message: "تم التقييم مسبقاً." }, { status: 409 });
  }
  const feedback = await prisma.ticketFeedback.create({
    data: {
      ticketId,
      customerId: cu.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    },
  });
  return NextResponse.json({ feedback }, { status: 201 });
}
