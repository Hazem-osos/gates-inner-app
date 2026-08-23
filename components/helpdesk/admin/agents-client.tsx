"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Agent = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

export function AdminAgentsClient() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "AGENT" as "ADMIN" | "AGENT",
  });

  async function load() {
    const res = await fetch("/api/support/agents");
    if (res.ok) {
      const j = (await res.json()) as { agents: Agent[] };
      setAgents(j.agents);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/support/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) toast.error("تعذر إنشاء الوكيل.");
    else {
      toast.success("تم.");
      void load();
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="grid max-w-md gap-2 rounded-xl border p-4">
        <h2 className="font-semibold">وكيل / مدير جديد</h2>
        <Input
          placeholder="الاسم"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          type="email"
          dir="ltr"
          placeholder="البريد"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <Input
          type="password"
          dir="ltr"
          placeholder="كلمة المرور"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <select
          className="h-9 rounded-lg border px-2 text-sm"
          value={form.role}
          onChange={(e) =>
            setForm({ ...form, role: e.target.value as "ADMIN" | "AGENT" })
          }
        >
          <option value="AGENT">وكيل</option>
          <option value="ADMIN">مدير</option>
        </select>
        <Button type="submit">إنشاء</Button>
      </form>
      <ul className="space-y-2 text-sm">
        {agents.map((a) => (
          <li key={a.id} className="rounded-lg border p-3">
            {a.name} — {a.email} ({a.role === "ADMIN" ? "مدير" : "وكيل"})
          </li>
        ))}
      </ul>
    </div>
  );
}
