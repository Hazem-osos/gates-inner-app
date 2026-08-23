"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

import { SupportNotificationsBell } from "@/components/helpdesk/notifications-bell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SupportRole } from "@prisma/client";

const links = (role: SupportRole) => {
  const base = [
    { href: "/support/dashboard", label: "لوحة التحكم" },
    { href: "/support/tickets", label: "التذاكر" },
  ];
  if (role === "ADMIN") {
    base.push(
      { href: "/support/admin/customers", label: "العملاء" },
      { href: "/support/admin/agents", label: "الوكلاء" },
      { href: "/support/admin/canned", label: "رسائل جاهزة" },
      { href: "/support/admin/audit", label: "تدقيق الإغلاق" },
      { href: "/support/admin/analytics", label: "التقييمات" }
    );
  }
  return base;
};

export function SupportNav({
  userName,
  role,
}: {
  userName: string;
  role: SupportRole;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">الدعم الفني</span>
          <nav className="flex flex-wrap gap-1">
            {links(role).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-muted"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <SupportNotificationsBell />
          <span className="text-xs text-muted-foreground">{userName}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/support/login" })}
          >
            خروج
          </Button>
        </div>
      </div>
    </header>
  );
}
