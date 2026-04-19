"use client";

import type { CustomFieldDefinition } from "@prisma/client";
import { CustomFieldValueType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  deleteCustomFieldDefinitionAction,
  upsertCustomFieldDefinitionAction,
} from "@/app/actions/admin-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Form = {
  key: string;
  labelAr: string;
  valueType: CustomFieldValueType;
  optionsJson: string;
  sortOrder: number;
};

export function CustomFieldsAdmin({
  definitions,
}: {
  definitions: CustomFieldDefinition[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<Form>({
    defaultValues: {
      key: "",
      labelAr: "",
      valueType: CustomFieldValueType.TEXT,
      optionsJson: "",
      sortOrder: 0,
    },
  });

  function onCreate(values: Form) {
    startTransition(async () => {
      const res = await upsertCustomFieldDefinitionAction({
        ...values,
        isRequired: false,
        isActive: true,
      });
      if (res.ok) {
        toast.success("تم الحفظ");
        form.reset();
        router.refresh();
      } else toast.error(res.message);
    });
  }

  function onDelete(id: string) {
    if (!confirm("حذف الحقل؟")) return;
    startTransition(async () => {
      const res = await deleteCustomFieldDefinitionAction(id);
      if (res.ok) {
        toast.success("تم الحذف");
        router.refresh();
      } else toast.error(res.message);
    });
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={form.handleSubmit(onCreate)}
        className="grid max-w-xl gap-3 rounded-xl border border-border/70 p-4"
      >
        <h2 className="font-semibold">إضافة حقل مخصص</h2>
        <div className="space-y-1">
          <Label>المفتاح (لاتيني)</Label>
          <Input dir="ltr" className="text-left" {...form.register("key", { required: true })} />
        </div>
        <div className="space-y-1">
          <Label>التسمية العربية</Label>
          <Input dir="rtl" {...form.register("labelAr", { required: true })} />
        </div>
        <div className="space-y-1">
          <Label>النوع</Label>
          <Select
            value={form.watch("valueType")}
            onValueChange={(v) =>
              form.setValue("valueType", v as CustomFieldValueType)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CustomFieldValueType).map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>خيارات JSON (للنوع SELECT — مصفوفة نصوص)</Label>
          <Textarea
            dir="ltr"
            className="font-mono text-xs"
            placeholder='["خيار 1","خيار 2"]'
            {...form.register("optionsJson")}
          />
        </div>
        <div className="space-y-1">
          <Label>ترتيب العرض</Label>
          <Input
            type="number"
            dir="ltr"
            className="text-left w-24"
            {...form.register("sortOrder", { valueAsNumber: true })}
          />
        </div>
        <Button type="submit" disabled={pending}>
          حفظ
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المفتاح</TableHead>
            <TableHead>التسمية</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>نشط</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {definitions.map((d) => (
            <TableRow key={d.id}>
              <TableCell dir="ltr" className="font-mono text-xs">
                {d.key}
              </TableCell>
              <TableCell>{d.labelAr}</TableCell>
              <TableCell>{d.valueType}</TableCell>
              <TableCell>{d.isActive ? "نعم" : "لا"}</TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={() => onDelete(d.id)}
                >
                  حذف
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
