import { NextResponse } from "next/server";
import type { Prisma, TicketPriority, TicketStatus } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";

import { apiSupportUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const su = await apiSupportUser();
  if (!su) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const statusRaw = searchParams.get("status")?.trim();
  const agentId = searchParams.get("agent")?.trim();
  const customerId = searchParams.get("customer")?.trim();
  const priorityRaw = searchParams.get("priority")?.trim();
  const from = searchParams.get("from")?.trim();
  const to = searchParams.get("to")?.trim();

  const andParts: Prisma.TicketWhereInput[] = [];

  if (statusRaw && ["OPEN", "IN_PROGRESS", "CLOSED"].includes(statusRaw)) {
    andParts.push({ status: statusRaw as TicketStatus });
  }
  if (customerId) andParts.push({ customerId });
  if (
    priorityRaw &&
    ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priorityRaw)
  ) {
    andParts.push({ priority: priorityRaw as TicketPriority });
  }
  if (from) {
    andParts.push({ createdAt: { gte: startOfDay(new Date(from)) } });
  }
  if (to) {
    andParts.push({ createdAt: { lte: endOfDay(new Date(to)) } });
  }

  if (su.supportRole === "AGENT") {
    andParts.push({
      OR: [{ assignedAgentId: su.id }, { assignedAgentId: null }],
    });
  } else if (agentId === "unassigned") {
    andParts.push({ assignedAgentId: null });
  } else if (agentId) {
    andParts.push({ assignedAgentId: agentId });
  }

  const where: Prisma.TicketWhereInput =
    andParts.length === 0
      ? {}
      : andParts.length === 1
        ? andParts[0]!
        : { AND: andParts };

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      customer: { select: { companyName: true, contactName: true } },
      assignedAgent: { select: { name: true } },
      feedback: { select: { rating: true } },
    },
  });
  return NextResponse.json({ tickets });
}
