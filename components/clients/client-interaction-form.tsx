"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { logInteractionAction } from "@/app/actions/interactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Form = {
  interactionAt: string;
  notes: string;
  followUpStatus: string;
  nextFollowUpAt: string;
};

function defaultLocalDate(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function ClientInteractionForm({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<Form>({
    defaultValues: {
      interactionAt: defaultLocalDate(),
      notes: "",
      followUpStatus: "",
      nextFollowUpAt: "",
    },
  });

  function onSubmit(values: Form) {
    startTransition(async () => {
      const res = await logInteractionAction({ clientId, ...values });
      if (res.ok) {
        toast.success("تم تسجيل المتابعة");
        form.reset({
          interactionAt: defaultLocalDate(),
          notes: "",
          followUpStatus: "",
          nextFollowUpAt: "",
        });
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid gap-4 rounded-xl border border-border/70 bg-card p-4 md:grid-cols-2"
    >
      <h3 className="text-base font-semibold md:col-span-2">تسجيل متابعة جديدة</h3>
      <div className="space-y-2">
        <Label htmlFor="interactionAt">تاريخ الاتصال</Label>
        <Input
          id="interactionAt"
          type="date"
          dir="ltr"
          className="text-left"
          {...form.register("interactionAt", { required: true })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nextFollowUpAt">تاريخ المتابعة التالي (إجباري)</Label>
        <Input
          id="nextFollowUpAt"
          type="date"
          dir="ltr"
          className="text-left"
          {...form.register("nextFollowUpAt", { required: true })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="followUpStatus">موقف المتابعة</Label>
        <Input id="followUpStatus" dir="rtl" {...form.register("followUpStatus")} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">ملخص / ملاحظات المكالمة</Label>
        <Textarea id="notes" rows={3} dir="rtl" {...form.register("notes", { required: true })} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "جاري الحفظ…" : "حفظ المتابعة"}
        </Button>
      </div>
    </form>
  );
}
