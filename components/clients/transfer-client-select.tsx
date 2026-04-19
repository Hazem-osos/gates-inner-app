"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { transferClientToSalesAction } from "@/app/actions/transfer-client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SalesUser = { id: string; name: string };

export function TransferClientSelect({
  clientId,
  salesUsers,
}: {
  clientId: string;
  salesUsers: SalesUser[];
}) {
  const [pending, start] = useTransition();

  function onChange(toUserId: string) {
    if (!toUserId) return;
    start(async () => {
      const res = await transferClientToSalesAction(clientId, toUserId);
      if (res.ok) toast.success("تم نقل العميل");
      else toast.error(res.message);
    });
  }

  if (salesUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Select
        onValueChange={(v: string | null) => {
          if (typeof v === "string" && v) onChange(v);
        }}
      >
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue placeholder="نقل إلى سيلز…" />
        </SelectTrigger>
        <SelectContent>
          {salesUsers.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? (
        <span className="text-xs text-muted-foreground">جاري…</span>
      ) : null}
    </div>
  );
}
