"use client";

import { ClientStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { changeClientStatusAction } from "@/app/actions/client-update";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ClientPipelinePanel({
  clientId,
  currentStatus,
}: {
  clientId: string;
  currentStatus: ClientStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [contractValue, setContractValue] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [closedLostAt, setClosedLostAt] = useState("");

  function run(
    toStatus: ClientStatus,
    extra?: Record<string, string | undefined>
  ) {
    startTransition(async () => {
      const res = await changeClientStatusAction({
        clientId,
        toStatus,
        contractValue: extra?.contractValue ?? contractValue,
        saleDate: extra?.saleDate ?? saleDate,
        lossReason: extra?.lossReason ?? lossReason,
        closedLostAt: extra?.closedLostAt ?? closedLostAt,
      });
      if (res.ok) {
        toast.success("تم تحديث حالة العميل");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  const pipeline =
    currentStatus === ClientStatus.B || currentStatus === ClientStatus.NOT_B;

  if (!pipeline) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
        العميل في حالة نهائية (بيع أو إغلاق). لا يمكن تغيير التصنيف من هنا.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
      <h3 className="text-base font-semibold">مسار العميل (Pipeline)</h3>
      <div className="flex flex-wrap gap-2">
        {currentStatus === ClientStatus.NOT_B ? (
          <Button
            type="button"
            size="sm"
            onClick={() => run(ClientStatus.B)}
            disabled={pending}
          >
            ترقية إلى B
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => run(ClientStatus.NOT_B)}
            disabled={pending}
          >
            إرجاع إلى Not B
          </Button>
        )}
      </div>

      <div className="grid gap-4 border-t border-border/60 pt-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <p className="text-sm font-medium">تم البيع</p>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <Label>قيمة التعاقد</Label>
                <Input
                  dir="ltr"
                  className="text-left"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>تاريخ البيع</Label>
                <Input
                  type="datetime-local"
                  dir="ltr"
                  className="text-left"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => run(ClientStatus.WON)}
              disabled={pending}
            >
              تعيين: تم البيع
            </Button>
          </div>
          <div className="space-y-2 md:col-span-2">
            <p className="text-sm font-medium">تم الإغلاق</p>
            <div className="space-y-1">
              <Label>سبب الإغلاق</Label>
              <Textarea
                rows={2}
                dir="rtl"
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>تاريخ الإغلاق</Label>
              <Input
                type="datetime-local"
                dir="ltr"
                className="text-left"
                value={closedLostAt}
                onChange={(e) => setClosedLostAt(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => run(ClientStatus.LOST)}
              disabled={pending}
            >
              تعيين: تم الإغلاق
            </Button>
          </div>
        </div>
    </div>
  );
}
