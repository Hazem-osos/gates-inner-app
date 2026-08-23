import { NextResponse } from "next/server";
import { z } from "zod";

import { evaluateTicketCreation } from "@/lib/helpdesk/license";
import { notifyOnTicketCreated } from "@/lib/helpdesk/notifications";
import { apiCustomerUser } from "@/lib/helpdesk/session-api";
import { generateTicketNumber } from "@/lib/helpdesk/ticket-number";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  subject: z.string().trim().min(3).max(255),
  description: z.string().trim().min(10),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  isVoiceTranscribed: z.boolean().optional(),
});

export async function GET(req: Request) {
  const cu = await apiCustomerUser();
  if (!cu) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "active";
  const where =
    scope === "history"
      ? { customerId: cu.id, status: "CLOSED" as const }
      : {
          customerId: cu.id,
          status: { in: ["OPEN", "IN_PROGRESS"] as ("OPEN" | "IN_PROGRESS")[] },
        };
  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { feedback: true },
  });
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: cu.id },
  });
  const eligibility = evaluateTicketCreation(customer);
  return NextResponse.json({ tickets, eligibility, customer });
}

export async function POST(req: Request) {
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
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: "بيانات التذكرة غير صالحة." }, { status: 400 });
  }
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: cu.id },
  });
  const eligibility = evaluateTicketCreation(customer);
  if (!eligibility.ok) {
    const msg =
      eligibility.reason === "inactive"
        ? "حسابك غير مفعّل."
        : "انتهت الرخصة ولا يمكن فتح تذاكر جديدة.";
    return NextResponse.json({ message: msg }, { status: 403 });
  }
  const ticketNumber = await generateTicketNumber();
  const ticket = await prisma.$transaction(async (tx) => {
    if (eligibility.courtesy) {
      await tx.customer.update({
        where: { id: customer.id },
        data: { hasUsedCourtesyTicket: true },
      });
    }
    return tx.ticket.create({
      data: {
        ticketNumber,
        subject: parsed.data.subject,
        description: parsed.data.description,
        priority: parsed.data.priority ?? "MEDIUM",
        isVoiceTranscribed: parsed.data.isVoiceTranscribed ?? false,
        isCourtesyTicket: eligibility.courtesy,
        customerId: customer.id,
        assignedAgentId: customer.assignedAgentId,
      },
    });
  });
  await notifyOnTicketCreated({
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    customerCompany: customer.companyName,
    assignedAgentId: customer.assignedAgentId,
  });
  return NextResponse.json({ ticket }, { status: 201 });
}
