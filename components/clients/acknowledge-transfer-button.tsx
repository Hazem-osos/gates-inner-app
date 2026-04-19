"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { acknowledgeTransferredClientAction } from "@/app/actions/transfer-client";
import { Button } from "@/components/ui/button";

export function AcknowledgeTransferButton({
  transferId,
}: {
  transferId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await acknowledgeTransferredClientAction(transferId);
          if (res.ok) toast.success("تم تسجيل الاطلاع");
          else toast.error(res.message);
        })
      }
    >
      تم الاطلاع
    </Button>
  );
}
