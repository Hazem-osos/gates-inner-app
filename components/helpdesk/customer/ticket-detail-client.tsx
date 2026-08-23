"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ticketPriorityLabelAr,
  ticketStatusLabelAr,
} from "@/lib/helpdesk/labels";
import type { TicketPriority, TicketStatus } from "@prisma/client";

export function CustomerTicketDetailClient({
  ticket,
  hasFeedback,
}: {
  ticket: {
    id: string;
    ticketNumber: string;
    subject: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    resolution: { resolutionDetails: string } | null;
  };
  hasFeedback: boolean;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitFeedback() {
    setBusy(true);
    try {
      const res = await fetch(`/api/customer/tickets/${ticket.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        toast.error(j.message ?? "تعذر إرسال التقييم.");
        return;
      }
      toast.success("شكراً — تم حفظ تقييمك.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs text-muted-foreground" dir="ltr">
          {ticket.ticketNumber}
        </p>
        <h1 className="text-xl font-bold">{ticket.subject}</h1>
        <p className="mt-2 text-sm">
          {ticketStatusLabelAr(ticket.status)} ·{" "}
          {ticketPriorityLabelAr(ticket.priority)}
        </p>
      </div>
      <div className="rounded-xl border p-4">
        <h2 className="mb-2 text-sm font-semibold">الوصف</h2>
        <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
      </div>
      {ticket.resolution ? (
        <div className="rounded-xl border bg-muted/30 p-4">
          <h2 className="text-sm font-semibold">ملخص الحل</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm">
            {ticket.resolution.resolutionDetails}
          </p>
        </div>
      ) : null}
      {ticket.status === "CLOSED" && !hasFeedback ? (
        <div className="space-y-3 rounded-xl border p-4">
          <h2 className="font-semibold">تقييم الخدمة</h2>
          <div className="space-y-2">
            <Label htmlFor="rating">التقييم (1–5)</Label>
            <select
              id="rating"
              className="h-9 rounded-lg border px-2"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} نجوم
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">تعليق (اختياري)</Label>
            <Textarea
              id="comment"
              rows={3}
              dir="rtl"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <Button type="button" disabled={busy} onClick={() => void submitFeedback()}>
            إرسال التقييم
          </Button>
        </div>
      ) : null}
      {hasFeedback ? (
        <p className="text-sm text-muted-foreground">تم إرسال التقييم لهذه التذكرة.</p>
      ) : null}
    </div>
  );
}
