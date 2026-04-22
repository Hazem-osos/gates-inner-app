"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  acknowledgeRecommendationAction,
  createRecommendationAction,
} from "@/app/actions/recommendations";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTimeArabic } from "@/lib/date-arabic";
import { userDisplayName } from "@/lib/user-display-name";

type SalesUser = { id: string; name: string; email: string };

type Rec = {
  id: string;
  targetUserId: string;
  body: string;
  createdAt: string;
  acknowledgedAt: string | null;
  author: { name: string; deletedAt: Date | string | null };
  targetUser: { name: string; deletedAt: Date | string | null };
};

export function ClientRecommendationsPanel({
  clientId,
  canCreate,
  salesUsers,
  recommendations,
  currentUserId,
}: {
  clientId: string;
  canCreate: boolean;
  salesUsers: SalesUser[];
  recommendations: Rec[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<{ body: string; targetUserId: string }>({
    defaultValues: { body: "", targetUserId: salesUsers[0]?.id ?? "" },
  });

  function onCreate(values: { body: string; targetUserId: string }) {
    startTransition(async () => {
      const res = await createRecommendationAction({
        clientId,
        body: values.body,
        targetUserId: values.targetUserId,
      });
      if (res.ok) {
        toast.success("تم إرسال التوصية والتنبيه");
        form.reset({ body: "", targetUserId: salesUsers[0]?.id ?? "" });
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  function ack(id: string) {
    startTransition(async () => {
      const res = await acknowledgeRecommendationAction(id);
      if (res.ok) {
        toast.success("تم التأكيد");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/70 p-4">
      <h3 className="text-base font-semibold">توصيات الإدارة</h3>
      {canCreate && salesUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          لا يوجد مستخدمون بدور مبيعات لتوجيه التوصية إليهم.
        </p>
      ) : null}
      {canCreate && salesUsers.length > 0 ? (
        <form
          onSubmit={form.handleSubmit(onCreate)}
          className="grid gap-3 border-b border-border/60 pb-4"
        >
          <div className="space-y-1">
            <Label>المندوب المستهدف</Label>
            <Select
              value={form.watch("targetUserId") || undefined}
              onValueChange={(v) => form.setValue("targetUserId", v ?? "")}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="اختر مندوباً" />
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
          <div className="space-y-1">
            <Label>نص التوصية</Label>
            <Textarea rows={3} dir="rtl" {...form.register("body", { required: true })} />
          </div>
          <Button type="submit" disabled={pending} className="w-fit">
            إرسال للمندوب
          </Button>
        </form>
      ) : null}

      <ul className="space-y-3 text-sm">
        {recommendations.map((r) => (
          <li key={r.id} className="rounded-lg border border-border/60 p-3">
            <p className="text-muted-foreground">
              من {userDisplayName(r.author)} — إلى{" "}
              {userDisplayName(r.targetUser)} —{" "}
              {formatDateTimeArabic(new Date(r.createdAt))}
            </p>
            <p className="mt-1 whitespace-pre-wrap" dir="rtl">
              {r.body}
            </p>
            {r.targetUserId === currentUserId && !r.acknowledgedAt ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={pending}
                onClick={() => ack(r.id)}
              >
                تأكيد التنفيذ
              </Button>
            ) : r.acknowledgedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                تم التأكيد{" "}
                {formatDateTimeArabic(new Date(r.acknowledgedAt))}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
