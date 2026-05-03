"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

import { createWarmingSentAction } from "@/app/actions/warming-actions";
import { Button } from "@/components/ui/button";
import { ArabicDateField } from "@/components/ui/arabic-date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Form = {
  communicatedAt: string;
  activitySnapshot: string;
  day1Content: string;
  day2Content: string;
  day3Content: string;
  notes: string;
};

export function ClientWarmingForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<Form>({
    defaultValues: {
      communicatedAt: "",
      activitySnapshot: "",
      day1Content: "",
      day2Content: "",
      day3Content: "",
      notes: "",
    },
  });

  function onSubmit(values: Form) {
    startTransition(async () => {
      const res = await createWarmingSentAction({ clientId, ...values });
      if (res.ok) {
        toast.success("تم حفظ أدوات الـ Warming");
        form.reset();
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid gap-3 rounded-xl border border-border/70 p-4 md:grid-cols-2"
    >
      <h4 className="font-medium md:col-span-2">إضافة سجل Warming</h4>
      <div className="space-y-1">
        <Label>تاريخ التواصل</Label>
        <Controller
          name="communicatedAt"
          control={form.control}
          render={({ field }) => (
            <ArabicDateField
              valueYmd={field.value ?? ""}
              onValueChange={field.onChange}
              buttonClassName="h-9 w-full justify-center font-semibold"
            />
          )}
        />
      </div>
      <div className="space-y-1">
        <Label>النشاط (لقطة)</Label>
        <Input dir="rtl" {...form.register("activitySnapshot")} />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>اليوم 1</Label>
        <Textarea rows={2} dir="rtl" {...form.register("day1Content")} />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>اليوم 2</Label>
        <Textarea rows={2} dir="rtl" {...form.register("day2Content")} />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>اليوم 3</Label>
        <Textarea rows={2} dir="rtl" {...form.register("day3Content")} />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>ملاحظات</Label>
        <Textarea rows={2} dir="rtl" {...form.register("notes")} />
      </div>
      <Button type="submit" disabled={pending} className="md:col-span-2 w-fit">
        {pending ? "…" : "حفظ"}
      </Button>
    </form>
  );
}
