"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function SignOutButton({ className }: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={cn(
        "shrink-0 rounded-xl border-zinc-200 bg-white text-sm font-medium text-zinc-600 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900",
        className
      )}
    >
      تسجيل الخروج
    </Button>
  );
}
