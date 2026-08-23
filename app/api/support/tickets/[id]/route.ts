import { NextResponse } from "next/server";
import { z } from "zod";

import { apiSupportUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS"]).optional(),
  assignedAgentId: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const su = await apiSupportUser();
  if (!su) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      customer: true,
      assignedAgent: { select: { id: true, name: true, email: true } },
      resolution: { include: { agent: { select: { name: true } } } },
      feedback: true,
    },
  });
  if (!ticket) {
    return NextResponse.json({ message: "التذكرة غير موجودة." }, { status: 404 });
  }
  if (
    su.supportRole === "AGENT" &&
    ticket.assignedAgentId &&
    ticket.assignedAgentId !== su.id
  ) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
  }
  return NextResponse.json({ ticket });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const su = await apiSupportUser();
  if (!su) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  const { id } = await ctx.params;
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
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "التذكرة غير موجودة." }, { status: 404 });
  }
  if (existing.status === "CLOSED") {
    return NextResponse.json({ message: "التذكرة مغلقة." }, { status: 400 });
  }
  if (
    su.supportRole === "AGENT" &&
    existing.assignedAgentId &&
    existing.assignedAgentId !== su.id
  ) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
  }
  const data: {
    status?: "OPEN" | "IN_PROGRESS";
    assignedAgentId?: string | null;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  } = {};
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.priority) data.priority = parsed.data.priority;
  if (parsed.data.assignedAgentId !== undefined) {
    if (su.supportRole !== "ADMIN" && parsed.data.assignedAgentId !== su.id) {
      return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
    }
    data.assignedAgentId = parsed.data.assignedAgentId;
  }
  if (
    su.supportRole === "AGENT" &&
    !existing.assignedAgentId &&
    parsed.data.status &&
    !data.assignedAgentId
  ) {
    data.assignedAgentId = su.id;
  }
  const ticket = await prisma.ticket.update({ where: { id }, data });
  return NextResponse.json({ ticket });
}
