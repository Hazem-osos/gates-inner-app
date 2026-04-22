"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteClientByIdAction } from "@/app/actions/delete-client";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/simple-dialog";

export function DeleteClientButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function execute() {
    start(async () => {
      const res = await deleteClientByIdAction(clientId);
      if (res.ok) {
        toast.success("تم حذف العميل وكل بياناته المرتبطة.");
        setOpen(false);
        router.push("/clients");
        router.refresh();
        return;
      }
      toast.error(res.message);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
      >
        حذف العميل
      </Button>
      <SimpleDialog
        open={open}
        onOpenChange={setOpen}
        closeOnBackdrop={!pending}
        closeOnEscape={!pending}
        title="تأكيد حذف العميل"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={execute}
            >
              {pending ? "جاري الحذف…" : "حذف نهائي"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-1 text-sm" dir="rtl">
          <p>
            سيتم <span className="font-semibold">حذف دائم</span> للعميل{" "}
            <span className="font-medium text-foreground">«{clientName}»</span>{" "}
            وكل ما يرتبط به:{" "}
            <span className="text-muted-foreground">
              سجل المتابعات، توصيات الإدارة، Warming، التنبيهات، سجل العمل،
              وغيرها.
            </span>
          </p>
          <p className="text-destructive">
            لا يمكن التراجع عن هذا الإجراء.
          </p>
        </div>
      </SimpleDialog>
    </>
  );
}
