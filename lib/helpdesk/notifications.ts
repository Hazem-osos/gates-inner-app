import {
  NotificationRecipientType,
  SupportRole,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function notifyOnTicketCreated(args: {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  customerCompany: string;
  assignedAgentId: string | null;
}) {
  const title = `تذكرة جديدة: ${args.ticketNumber}`;
  const message = `شركة «${args.customerCompany}» — ${args.subject}`;

  const admins = await prisma.supportUser.findMany({
    where: { isActive: true, role: SupportRole.ADMIN },
    select: { id: true },
  });

  const rows: Prisma.NotificationCreateManyInput[] = [];

  for (const a of admins) {
    rows.push({
      recipientType: NotificationRecipientType.ADMIN,
      recipientId: a.id,
      title,
      message,
      ticketId: args.ticketId,
    });
  }

  if (args.assignedAgentId) {
    rows.push({
      recipientType: NotificationRecipientType.AGENT,
      recipientId: args.assignedAgentId,
      title,
      message,
      ticketId: args.ticketId,
    });
  } else {
    const agents = await prisma.supportUser.findMany({
      where: { isActive: true, role: SupportRole.AGENT },
      select: { id: true },
    });
    for (const ag of agents) {
      rows.push({
        recipientType: NotificationRecipientType.AGENT,
        recipientId: ag.id,
        title,
        message,
        ticketId: args.ticketId,
      });
    }
  }

  if (rows.length > 0) {
    await prisma.notification.createMany({ data: rows });
  }
}

export async function notifyCustomer(args: {
  customerId: string;
  title: string;
  message: string;
  ticketId?: string;
}) {
  await prisma.notification.create({
    data: {
      recipientType: NotificationRecipientType.CUSTOMER,
      recipientId: args.customerId,
      title: args.title,
      message: args.message,
      ticketId: args.ticketId,
    },
  });
}

export async function notifyCustomerTicketClosed(args: {
  customerId: string;
  ticketId: string;
  ticketNumber: string;
}) {
  await notifyCustomer({
    customerId: args.customerId,
    ticketId: args.ticketId,
    title: "تم إغلاق تذكرتك",
    message: `التذكرة ${args.ticketNumber} أُغلقت. يمكنك تقييم الخدمة من صفحة التذكرة.`,
  });
}
