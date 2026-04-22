"use client";

import type { UserRole } from "@prisma/client";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PickerUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

function roleLabelAr(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "أدمن";
    case "MANAGER":
      return "مدير";
    case "SALES":
      return "سيلز";
    default:
      return role;
  }
}

export function LoginForm({
  showRegister = false,
  showEmployeePicker = false,
}: {
  showRegister?: boolean;
  /** يظهر عند `ALLOW_OPEN_REGISTRATION` — قائمة من قاعدة البيانات لتعبئة البريد */
  showEmployeePicker?: boolean;
}) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerUsers, setPickerUsers] = useState<PickerUser[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    if (!showEmployeePicker || !pickerOpen) return;
    let cancelled = false;
    setPickerLoading(true);
    setPickerError(null);
    void (async () => {
      try {
        const res = await fetch("/api/login/registered-users");
        const data = (await res.json()) as {
          users?: PickerUser[];
          message?: string;
        };
        if (!res.ok) {
          if (!cancelled) {
            setPickerUsers([]);
            setPickerError(data.message ?? "تعذر تحميل القائمة.");
          }
          return;
        }
        if (!cancelled) setPickerUsers(data.users ?? []);
      } catch {
        if (!cancelled) {
          setPickerUsers([]);
          setPickerError("تعذر الاتصال بالخادم.");
        }
      } finally {
        if (!cancelled) setPickerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showEmployeePicker, pickerOpen]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("البريد أو كلمة المرور غير صحيحة.");
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-lg border border-border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">بعد تشغيل البذرة (`npx prisma db seed`):</p>
          <ul className="list-inside list-disc space-y-1" dir="ltr">
            <li>
              <span className="font-mono">admin@crm.local</span> /{" "}
              <span className="font-mono">admin123</span> (مدير — إعدادات النظام)
            </li>
            <li>
              <span className="font-mono">sales@crm.local</span> /{" "}
              <span className="font-mono">sales123</span> (مبيعات)
            </li>
            <li>
              <span className="font-mono">manager@crm.local</span> /{" "}
              <span className="font-mono">manager123</span> (مدير مبيعات — توصيات)
            </li>
          </ul>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          {showEmployeePicker ? (
            <div className="rounded-lg border border-border bg-background/80 p-3 shadow-sm">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <Checkbox
                  id="employee-picker-toggle"
                  checked={pickerOpen}
                  onCheckedChange={(v) => setPickerOpen(v === true)}
                  className="mt-0.5"
                />
                <span className="min-w-0 leading-snug">
                  <span className="font-medium text-foreground">
                    اختيار موظف من القاعدة
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    عند التفعيل تُعرض الأسماء المسجّلة؛ اضغط اسماً ليُنسخ بريده إلى
                    حقل تسجيل الدخول.
                  </span>
                </span>
              </label>
              {pickerOpen ? (
                <div className="mt-3 border-t border-border/80 pt-3">
                  {pickerLoading ? (
                    <p className="text-xs text-muted-foreground">جاري التحميل…</p>
                  ) : pickerError ? (
                    <p className="text-xs text-destructive">{pickerError}</p>
                  ) : pickerUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      لا يوجد موظفون نشطون في القاعدة.
                    </p>
                  ) : (
                    <ul
                      className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border/70 bg-muted/30 p-1.5"
                      role="listbox"
                      aria-label="الموظفون المسجّلون"
                    >
                      {pickerUsers.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            role="option"
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-start text-sm transition-colors",
                              "hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            )}
                            title={u.email}
                            onClick={() => {
                              setEmail(u.email);
                              setError(null);
                            }}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-foreground">
                                {u.name}
                              </span>
                              <span
                                className="mt-0.5 block truncate text-[0.7rem] text-muted-foreground"
                                dir="ltr"
                              >
                                {u.email}
                              </span>
                            </span>
                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">
                              {roleLabelAr(u.role)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
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
              autoComplete="current-password"
              dir="ltr"
              className="text-left"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "جاري الدخول…" : "دخول"}
          </Button>
          {showRegister ? (
            <p className="text-center text-xs text-muted-foreground">
              <a href="/register" className="text-primary underline underline-offset-4">
                تسجيل مستخدم جديد
              </a>
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
