"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Customer = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  licenseEndDate: string;
  hasUsedCourtesyTicket: boolean;
  assignedAgent: { name: string } | null;
};

export function AdminCustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    password: "",
    licenseStartDate: "",
    licenseEndDate: "",
  });

  async function load() {
    const res = await fetch("/api/support/customers");
    if (res.ok) {
      const j = (await res.json()) as { customers: Customer[] };
      setCustomers(j.customers);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/support/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) toast.error("تعذر إنشاء العميل.");
    else {
      toast.success("تم إنشاء العميل.");
      void load();
    }
  }

  async function extendLicense(id: string, end: string) {
    const res = await fetch(`/api/support/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseEndDate: end, hasUsedCourtesyTicket: false }),
    });
    if (res.ok) {
      toast.success("تم تحديث الرخصة.");
      void load();
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="grid max-w-lg gap-3 rounded-xl border p-4">
        <h2 className="font-semibold">عميل جديد</h2>
        <Input
          placeholder="اسم الشركة"
          value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          required
        />
        <Input
          placeholder="اسم المسؤول"
          value={form.contactName}
          onChange={(e) => setForm({ ...form, contactName: e.target.value })}
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
        <Label className="text-xs">بداية الرخصة</Label>
        <Input
          type="date"
          dir="ltr"
          value={form.licenseStartDate}
          onChange={(e) =>
            setForm({ ...form, licenseStartDate: e.target.value })
          }
          required
        />
        <Label className="text-xs">نهاية الرخصة</Label>
        <Input
          type="date"
          dir="ltr"
          value={form.licenseEndDate}
          onChange={(e) => setForm({ ...form, licenseEndDate: e.target.value })}
          required
        />
        <Button type="submit">إنشاء</Button>
      </form>
      <ul className="space-y-2">
        {customers.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
          >
            <div>
              <p className="font-semibold">{c.companyName}</p>
              <p className="text-muted-foreground">{c.email}</p>
              <p className="text-xs" dir="ltr">
                رخصة حتى: {c.licenseEndDate.slice(0, 10)}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const d = prompt("تاريخ نهاية الرخصة YYYY-MM-DD");
                if (d) void extendLicense(c.id, d);
              }}
            >
              تجديد الرخصة
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
