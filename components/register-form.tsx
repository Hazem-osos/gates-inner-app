"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { registerUserAction } from "@/app/actions/register-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"SALES" | "MANAGER">("SALES");
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await registerUserAction({ email, password, name, role });
      if (res.ok) {
        toast.success("تم إنشاء الحساب. يمكنك تسجيل الدخول.");
        setEmail("");
        setPassword("");
        setName("");
      } else toast.error(res.message);
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>تسجيل مستخدم جديد</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم الموظف</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">البريد (اسم المستخدم)</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              dir="ltr"
              className="text-left"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              dir="ltr"
              className="text-left"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">نوع الحساب</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="role"
                checked={role === "SALES"}
                onChange={() => setRole("SALES")}
              />
              سيلز
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="role"
                checked={role === "MANAGER"}
                onChange={() => setRole("MANAGER")}
              />
              مدير
            </label>
          </fieldset>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "جاري التسجيل…" : "إنشاء الحساب"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
