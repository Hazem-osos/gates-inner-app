"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/customer/tickets", label: "التذاكر النشطة" },
  { href: "/customer/tickets/new", label: "تذكرة جديدة" },
  { href: "/customer/history", label: "السجل" },
];

export function CustomerNav({
  userName,
  companyName,
}: {
  userName: string;
  companyName: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-bold">بوابة الدعم — {companyName}</p>
          <nav className="mt-1 flex flex-wrap gap-1">
            {links.map((l) => (
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
          <span className="text-xs text-muted-foreground">{userName}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/customer/login" })}
          >
            خروج
          </Button>
        </div>
      </div>
    </header>
  );
}
