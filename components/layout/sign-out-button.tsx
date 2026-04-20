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
          "shrink-0 rounded-xl border-border bg-background text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground",
          className
        )}
      >
        تسجيل الخروج
      </Button>
    </form>
  );
}
