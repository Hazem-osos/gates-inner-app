import { CustomerTicketDetailClient } from "@/components/helpdesk/customer/ticket-detail-client";
import { requireCustomerSessionUser } from "@/lib/helpdesk/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCustomerSessionUser();
  const { id } = await params;
  const ticket = await prisma.ticket.findFirst({
    where: { id, customerId: user.id },
    include: {
      resolution: true,
      feedback: true,
    },
  });
  if (!ticket) {
    return <p className="text-destructive">التذكرة غير موجودة.</p>;
  }
  return (
    <CustomerTicketDetailClient
      ticket={{
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        resolution: ticket.resolution,
      }}
      hasFeedback={Boolean(ticket.feedback)}
    />
  );
}
