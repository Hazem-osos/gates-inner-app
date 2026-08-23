"use client";

import Link from "next/link";

import {
  ticketPriorityLabelAr,
  ticketStatusLabelAr,
} from "@/lib/helpdesk/labels";
import type { TicketPriority, TicketStatus } from "@prisma/client";

export function TicketListTable({
  tickets,
  detailPrefix,
}: {
  tickets: {
    id: string;
    ticketNumber: string;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    createdAt: string;
  }[];
  detailPrefix: string;
}) {
  if (tickets.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        لا توجد تذاكر.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-right">
            <th className="p-2">الرقم</th>
            <th className="p-2">الموضوع</th>
            <th className="p-2">الحالة</th>
            <th className="p-2">الأولوية</th>
            <th className="p-2">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id} className="border-b last:border-0">
              <td className="p-2 font-mono text-xs" dir="ltr">
                <Link
                  href={`${detailPrefix}/${t.id}`}
                  className="text-primary underline"
                >
                  {t.ticketNumber}
                </Link>
              </td>
              <td className="p-2">{t.subject}</td>
              <td className="p-2">{ticketStatusLabelAr(t.status)}</td>
              <td className="p-2">{ticketPriorityLabelAr(t.priority)}</td>
              <td className="p-2 tabular-nums text-muted-foreground" dir="ltr">
                {new Date(t.createdAt).toLocaleString("ar-EG")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
