import Link from "next/link";

import { TicketListTable } from "@/components/helpdesk/ticket-list-table";
import { buttonVariants } from "@/components/ui/button";
import { requireCustomerSessionUser } from "@/lib/helpdesk/auth-helpers";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomerActiveTicketsPage() {
  const user = await requireCustomerSessionUser();
  const tickets = await prisma.ticket.findMany({
    where: {
      customerId: user.id,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">التذاكر النشطة</h1>
        <Link
          href="/customer/tickets/new"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          تذكرة جديدة
        </Link>
      </div>
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
