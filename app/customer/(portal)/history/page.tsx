import { TicketListTable } from "@/components/helpdesk/ticket-list-table";
import { requireCustomerSessionUser } from "@/lib/helpdesk/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerHistoryPage() {
  const user = await requireCustomerSessionUser();
  const tickets = await prisma.ticket.findMany({
    where: { customerId: user.id, status: "CLOSED" },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">سجل التذاكر المغلقة</h1>
      <TicketListTable
        tickets={tickets.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
        }))}
        detailPrefix="/customer/tickets"
      />
    </div>
  );
}
