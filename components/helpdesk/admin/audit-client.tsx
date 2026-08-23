"use client";

import { useEffect, useState } from "react";

export function AdminAuditClient() {
  const [audits, setAudits] = useState<
    {
      id: string;
      resolutionDetails: string;
      closedAt: string;
      agent: { name: string };
      ticket: {
        ticketNumber: string;
        subject: string;
        description: string;
        customer: { companyName: string };
      };
    }[]
  >([]);

  useEffect(() => {
    void fetch("/api/support/analytics/resolutions")
      .then((r) => r.json())
      .then((j: { audits: typeof audits }) => setAudits(j.audits));
  }, []);

  return (
    <ul className="space-y-4">
      {audits.map((a) => (
        <li key={a.id} className="rounded-xl border p-4 text-sm">
          <p className="font-mono text-xs" dir="ltr">
            {a.ticket.ticketNumber}
          </p>
          <p className="font-semibold">{a.ticket.customer.companyName}</p>
          <p className="mt-2 text-muted-foreground">شكوى العميل:</p>
          <p className="whitespace-pre-wrap">{a.ticket.description}</p>
          <p className="mt-3 font-medium text-green-800 dark:text-green-200">
            إثبات الحل ({a.agent.name}):
          </p>
          <p className="whitespace-pre-wrap">{a.resolutionDetails}</p>
        </li>
      ))}
    </ul>
  );
}
