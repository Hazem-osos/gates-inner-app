"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ticketPriorityLabelAr,
  ticketStatusLabelAr,
} from "@/lib/helpdesk/labels";
import type { SupportRole, TicketPriority, TicketStatus } from "@prisma/client";

type TicketDetail = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  customer: { companyName: string; contactName: string };
  assignedAgent: { id: string; name: string } | null;
  resolution: { resolutionDetails: string; agent: { name: string } } | null;
};

export function SupportTicketDetailClient({
  ticketId,
  role,
}: {
  ticketId: string;
  role: SupportRole;
}) {
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [canned, setCanned] = useState<{ id: string; title: string }[]>([]);
  const [cannedId, setCannedId] = useState("");
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [tRes, cRes] = await Promise.all([
        fetch(`/api/support/tickets/${ticketId}`),
        fetch("/api/support/canned-messages"),
      ]);
      if (tRes.ok) {
        const j = (await tRes.json()) as { ticket: TicketDetail };
        setTicket(j.ticket);
      }
      if (cRes.ok) {
        const j = (await cRes.json()) as {
          messages: { id: string; title: string }[];
        };
        setCanned(j.messages);
      }
    })();
  }, [ticketId]);

  async function patchStatus(status: "OPEN" | "IN_PROGRESS") {
    setBusy(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) toast.error("تعذر تحديث الحالة.");
      else {
        toast.success("تم تحديث الحالة.");
        router.refresh();
        const j = (await res.json()) as { ticket: TicketDetail };
        setTicket((prev) => (prev ? { ...prev, status: j.ticket.status } : prev));
      }
    } finally {
      setBusy(false);
    }
  }

  async function sendCanned() {
    if (!cannedId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/canned`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cannedMessageId: cannedId }),
      });
      if (!res.ok) toast.error("تعذر إرسال التنبيه.");
      else toast.success("تم إرسال التنبيه للعميل.");
    } finally {
      setBusy(false);
    }
  }

  async function closeTicket() {
    if (resolution.trim().length < 20) {
      toast.error("يجب إدخال وصف للحل (20 حرفاً على الأقل).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionDetails: resolution }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(j.message ?? "تعذر الإغلاق.");
        return;
      }
      toast.success("تم إغلاق التذكرة.");
      router.push("/support/tickets");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!ticket) {
    return <p className="text-sm text-muted-foreground">جاري التحميل…</p>;
  }

  const closed = ticket.status === "CLOSED";

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs text-muted-foreground" dir="ltr">
          {ticket.ticketNumber}
        </p>
        <h1 className="text-xl font-bold">{ticket.subject}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ticket.customer.companyName} — {ticket.customer.contactName}
        </p>
        <p className="mt-2 text-sm">
          الحالة: {ticketStatusLabelAr(ticket.status)} · الأولوية:{" "}
          {ticketPriorityLabelAr(ticket.priority)}
        </p>
      </div>
      <div className="rounded-xl border p-4">
        <h2 className="mb-2 text-sm font-semibold">وصف المشكلة</h2>
        <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
      </div>
      {!closed ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void patchStatus("IN_PROGRESS")}
          >
            قيد المعالجة
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void patchStatus("OPEN")}
          >
            إعادة فتح
          </Button>
        </div>
      ) : null}
      {!closed ? (
        <div className="space-y-2 rounded-xl border p-4">
          <Label>تنبيه سريع للعميل</Label>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 min-w-[12rem] flex-1 rounded-lg border px-2 text-sm"
              value={cannedId}
              onChange={(e) => setCannedId(e.target.value)}
            >
              <option value="">— اختر رسالة —</option>
              {canned.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={busy || !cannedId}
              onClick={() => void sendCanned()}
            >
              إرسال
            </Button>
          </div>
        </div>
      ) : null}
      {!closed ? (
        <div className="space-y-3 rounded-xl border border-primary/30 p-4">
          <Label htmlFor="res">إغلاق التذكرة — وصف الحل والإثبات *</Label>
          <Textarea
            id="res"
            rows={5}
            dir="rtl"
            value={resolution}
            disabled={busy}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="اشرح السبب الجذري وما تم تنفيذه بالضبط…"
          />
          <Button type="button" disabled={busy} onClick={() => void closeTicket()}>
            إغلاق التذكرة
          </Button>
        </div>
      ) : (
        ticket.resolution && (
          <div className="rounded-xl border border-green-600/30 bg-green-500/5 p-4">
            <h2 className="text-sm font-semibold">تقرير الإغلاق</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">
              {ticket.resolution.resolutionDetails}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              الوكيل: {ticket.resolution.agent.name}
            </p>
          </div>
        )
      )}
    </div>
  );
}
