"use client";

import { useEffect, useState } from "react";

import { TicketListTable } from "@/components/helpdesk/ticket-list-table";
import type { TicketPriority, TicketStatus } from "@prisma/client";

export function SupportTicketsPageClient({ isAdmin }: { isAdmin: boolean }) {
  const [tickets, setTickets] = useState<
    {
      id: string;
      ticketNumber: string;
      subject: string;
      status: TicketStatus;
      priority: TicketPriority;
      createdAt: string;
    }[]
  >([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const q = status ? `?status=${status}` : "";
    void fetch(`/api/support/tickets${q}`)
      .then((r) => r.json())
      .then((j: { tickets: typeof tickets }) => setTickets(j.tickets));
  }, [status]);

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground">الحالة:</label>
          <select
            className="h-9 rounded-lg border px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">الكل</option>
            <option value="OPEN">مفتوحة</option>
            <option value="IN_PROGRESS">قيد المعالجة</option>
            <option value="CLOSED">مغلقة</option>
          </select>
        </div>
      ) : null}
      <TicketListTable tickets={tickets} detailPrefix="/support/tickets" />
    </div>
  );
}
