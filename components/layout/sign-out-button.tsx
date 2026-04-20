"use client";

import { signOutAndRedirectToLogin } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function SignOutButton({ className }: Props) {
  return (
    <form action={signOutAndRedirectToLogin} className="inline">
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className={cn(
          "shrink-0 rounded-xl border-zinc-200 bg-white text-sm font-medium text-zinc-600 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900",
          className
        )}
      >
        تسجيل الخروج
      </Button>
    </form>
  );
}
