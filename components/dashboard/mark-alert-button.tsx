"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { markAlertReadAction } from "@/app/actions/alerts";
import { Button } from "@/components/ui/button";

export function MarkAlertButton({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markAlertReadAction(alertId);
          router.refresh();
        })
      }
    >
      تمت القراءة
    </Button>
  );
}
