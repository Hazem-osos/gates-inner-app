"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { updateNewLeadAction } from "@/app/actions/new-leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleDialog } from "@/components/ui/simple-dialog";

export type EditNewLeadFields = {
  id: string;
  entryYmd: string;
  phone: string;
  adText: string;
};

export function EditNewLeadDialog({
  lead,
  open,
  onOpenChange,
}: {
  lead: EditNewLeadFields | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [adText, setAdText] = useState("");
  const [entryYmd, setEntryYmd] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead && open) {
      setPhone(lead.phone);
      setAdText(lead.adText);
      setEntryYmd(lead.entryYmd);
    }
  }, [lead, open]);

  async function save() {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await updateNewLeadAction({
        leadId: lead.id,
        entryYmd,
        phone,
        adText,
      });
      if (!res.ok) {
        toast.error(res.message ?? "فشل الحفظ.");
        return;
      }
      toast.success("تم تحديث الليد الجديد.");
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SimpleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="تعديل ليد جديد"
      closeOnBackdrop={!saving}
      closeOnEscape={!saving}
      contentClassName="max-w-md"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "جاري الحفظ…" : "حفظ"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            يوم العمل (التاريخ)
          </span>
          <Input
            type="date"
            value={entryYmd}
            onChange={(e) => setEntryYmd(e.target.value)}
            dir="ltr"
            className="font-mono text-[0.8rem]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">رقم الهاتف</span>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            className="text-left font-mono text-[0.8rem]"
            inputMode="tel"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">الإعلان</span>
          <Input
            value={adText}
            onChange={(e) => setAdText(e.target.value)}
            dir="rtl"
            autoComplete="off"
          />
        </label>
        <p className="text-xs leading-relaxed text-muted-foreground">
          أي مستخدم مسجّل يمكنه تعديل الليد الجديد. التعديل لا يغيّر من سجّل الليد
          أصلاً.
        </p>
      </div>
    </SimpleDialog>
  );
}
