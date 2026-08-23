import { NextResponse } from "next/server";

import { apiCustomerUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const cu = await apiCustomerUser();
  if (!cu) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const ticket = await prisma.ticket.findFirst({
    where: { id, customerId: cu.id },
    include: {
      feedback: true,
      resolution: true,
      assignedAgent: { select: { name: true } },
    },
  });
  if (!ticket) {
    return NextResponse.json({ message: "التذكرة غير موجودة." }, { status: 404 });
  }
  return NextResponse.json({ ticket });
}
