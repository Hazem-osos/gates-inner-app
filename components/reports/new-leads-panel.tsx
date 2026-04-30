"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createNewLeadAction } from "@/app/actions/new-leads";
import {
  EditNewLeadDialog,
  type EditNewLeadFields,
} from "@/components/reports/edit-new-lead-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { todayInputDate } from "@/lib/date-arabic";
import type { NewLeadListRow } from "@/lib/data/new-leads";
import { cn } from "@/lib/utils";

export function NewLeadsPanel({
  entryYmd,
  rows,
}: {
  entryYmd: string;
  rows: NewLeadListRow[];
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [adText, setAdText] = useState("");
  const [pending, start] = useTransition();
  const [editLead, setEditLead] = useState<EditNewLeadFields | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function save() {
    start(async () => {
      const res = await createNewLeadAction({
        entryYmd,
        phone,
        adText,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("تم حفظ الليد الجديد");
      setPhone("");
      setAdText("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/80 shadow-sm">
        <Table
          containerClassName={cn(
            "max-h-[min(55vh,calc(100vh-14rem))]",
            rows.length === 0 && "max-h-none"
          )}
        >
          <TableHeader>
            <TableRow className="[&_th]:pointer-events-none [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>رقم الهاتف</TableHead>
              <TableHead>الإعلان</TableHead>
              <TableHead className="min-w-[8rem]">اسم السيلز</TableHead>
              <TableHead className="min-w-[5rem]">تعديل</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  لا توجد Leads جديدة لهذا اليوم. أضف الصف الأول بالأسفل.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, idx) => (
                <TableRow key={r.id}>
                  <TableCell className="text-center text-muted-foreground tabular-nums">
                    {idx + 1}
                  </TableCell>
                  <TableCell dir="ltr" className="font-mono text-sm">
                    {r.phone}
                  </TableCell>
                  <TableCell className="text-sm">{r.adText}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.salesName}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="relative z-[1] h-7 text-xs"
                      onClick={() => {
                        setEditLead({
                          id: r.id,
                          entryYmd: r.entryYmd,
                          phone: r.phone,
                          adText: r.adText,
                        });
                        setEditOpen(true);
                      }}
                    >
                      تعديل
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border border-primary/25 bg-muted/20 p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium text-foreground">
          إضافة ليد جديد — يوم العمل:{" "}
          <span dir="ltr" className="tabular-nums">
            {entryYmd}
          </span>
          {entryYmd === todayInputDate() ? (
            <span className="ms-2 text-xs text-muted-foreground">(اليوم)</span>
          ) : null}
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">رقم الهاتف</span>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              className="text-left"
              inputMode="tel"
              autoComplete="off"
              placeholder="01…"
            />
          </label>
          <label className="flex min-w-[12rem] flex-[2] flex-col gap-1 text-sm">
            <span className="font-medium">الإعلان</span>
            <Input
              value={adText}
              onChange={(e) => setAdText(e.target.value)}
              dir="rtl"
              autoComplete="off"
              placeholder="اسم أو وصف الإعلان"
            />
          </label>
          <Button
            type="button"
            className="w-full md:w-auto"
            disabled={pending}
            onClick={save}
          >
            {pending ? "جاري…" : "حفظ"}
          </Button>
        </div>
      </div>

      <EditNewLeadDialog
        lead={editLead}
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditLead(null);
        }}
      />
    </div>
  );
}
