"use client";

import { useState, useTransition } from "react";
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
import { SimpleDialog } from "@/components/ui/simple-dialog";

type SalesUser = { id: string; name: string };

export function TransferClientDialog({
  clientId,
  salesUsers,
}: {
  clientId: string;
  salesUsers: SalesUser[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [pending, start] = useTransition();

  function execute() {
    if (!selected) {
      toast.error("اختر مندوب المبيعات.");
      return;
    }
    start(async () => {
      const res = await transferClientToSalesAction(clientId, selected);
      if (res.ok) {
        toast.success("تم نقل العميل.");
        setOpen(false);
        setSelected("");
      } else toast.error(res.message);
    });
  }

  if (salesUsers.length === 0) return null;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        نقل السيلز
      </Button>
      <SimpleDialog
        open={open}
        onOpenChange={setOpen}
        title="نقل عميل إلى سيلز آخر"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" disabled={pending || !selected} onClick={execute}>
              {pending ? "جاري…" : "تنفيذ"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-2">
          <p className="text-muted-foreground">اختر المندوب ثم اضغط تنفيذ.</p>
          <Select
            value={selected || undefined}
            onValueChange={(v: string | null) => setSelected(v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="قائمة السيلز" />
            </SelectTrigger>
            <SelectContent>
              {salesUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SimpleDialog>
    </>
  );
}
