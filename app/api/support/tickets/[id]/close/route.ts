import { NextResponse } from "next/server";
import { z } from "zod";

import {
  notifyCustomerTicketClosed,
} from "@/lib/helpdesk/notifications";
import { apiSupportUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  resolutionDetails: z.string().trim().min(20).max(12000),
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
    return NextResponse.json(
      { message: "يجب إدخال وصف للحل (20 حرفاً على الأقل)." },
      { status: 400 }
    );
  }
  const existing = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { customer: true },
  });
  if (!existing) {
    return NextResponse.json({ message: "التذكرة غير موجودة." }, { status: 404 });
  }
  if (existing.status === "CLOSED") {
    return NextResponse.json({ message: "التذكرة مغلقة مسبقاً." }, { status: 400 });
  }
  if (
    su.supportRole === "AGENT" &&
    existing.assignedAgentId &&
    existing.assignedAgentId !== su.id
  ) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
  }

  const agentId =
    existing.assignedAgentId ??
    (su.supportRole === "AGENT" ? su.id : su.id);

  await prisma.$transaction(async (tx) => {
    await tx.ticketResolutionAudit.create({
      data: {
        ticketId,
        agentId,
        resolutionDetails: parsed.data.resolutionDetails,
      },
    });
    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: "CLOSED",
        assignedAgentId: existing.assignedAgentId ?? agentId,
      },
    });
  });

  await notifyCustomerTicketClosed({
    customerId: existing.customerId,
    ticketId,
    ticketNumber: existing.ticketNumber,
  });

  return NextResponse.json({ ok: true });
}
