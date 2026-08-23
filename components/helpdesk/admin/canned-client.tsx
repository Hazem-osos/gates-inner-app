"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Msg = { id: string; title: string; content: string; isActive: boolean };

export function AdminCannedClient() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function load() {
    const res = await fetch("/api/support/canned-messages");
    if (res.ok) {
      const j = (await res.json()) as { messages: Msg[] };
      setMessages(j.messages);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/support/canned-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (res.ok) {
      toast.success("تم.");
      setTitle("");
      setContent("");
      void load();
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">رسالة جاهزة جديدة</h2>
        <Input
          placeholder="العنوان"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Textarea
          rows={3}
          placeholder="نص الرسالة"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <Button type="submit">حفظ</Button>
      </form>
      <ul className="space-y-2 text-sm">
        {messages.map((m) => (
          <li key={m.id} className="rounded-lg border p-3">
            <p className="font-semibold">{m.title}</p>
            <p className="text-muted-foreground">{m.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
