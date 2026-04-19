"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteClassificationAction,
  upsertClassificationAction,
} from "@/app/actions/classifications-admin";
import type { ClassificationRow } from "@/lib/data/classifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  initialRows: ClassificationRow[];
};

export function ClassificationsSettings({ initialRows }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#64748b");
  const [newIsB, setNewIsB] = useState(false);

  const sorted = useMemo(
    () =>
      [...initialRows].sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)
      ),
    [initialRows]
  );

  function refreshFromAction() {
    router.refresh();
  }

  function saveRow(r: ClassificationRow, patch: Partial<ClassificationRow>) {
    start(async () => {
      const res = await upsertClassificationAction({
        id: r.id,
        slug: r.slug,
        label: patch.label ?? r.label,
        color: patch.color ?? r.color,
        sortOrder: patch.sortOrder ?? r.sortOrder,
        isBRow: patch.isBRow ?? r.isBRow,
      });
      if (res.ok) {
        toast.success("تم الحفظ");
        refreshFromAction();
      } else toast.error(res.message);
    });
  }

  function addRow() {
    const label = newLabel.trim();
    if (!label) {
      toast.error("أدخل اسماً للتصنيف.");
      return;
    }
    start(async () => {
      const res = await upsertClassificationAction({
        label,
        color: newColor.trim() || "#64748b",
        sortOrder:
          (initialRows[initialRows.length - 1]?.sortOrder ?? 0) + 10,
        isBRow: newIsB,
      });
      if (res.ok) {
        toast.success("تمت الإضافة");
        setNewLabel("");
        setNewColor("#64748b");
        setNewIsB(false);
        refreshFromAction();
      } else toast.error(res.message);
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await deleteClassificationAction(id);
      if (res.ok) {
        toast.success("تم الحذف");
        refreshFromAction();
      } else toast.error(res.message);
    });
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border/80 p-4">
        <h2 className="mb-3 text-base font-semibold">إضافة تصنيف جديد</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <Label htmlFor="new-label">الاسم</Label>
            <Input
              id="new-label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="min-w-[160px]"
              dir="rtl"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="new-color">اللون</Label>
            <Input
              id="new-color"
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-9 w-14 p-1"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newIsB}
              onChange={(e) => setNewIsB(e.target.checked)}
              className="size-4 accent-primary"
            />
            تصنيف مسار B
          </label>
          <Button type="button" onClick={addRow} disabled={pending}>
            + إضافة تصنيف جديد
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الترتيب</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>اللون</TableHead>
              <TableHead>مسار B</TableHead>
              <TableHead className="text-left">حفظ / حذف</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <ClassificationRowEditor
                key={r.id}
                row={r}
                pending={pending}
                onSave={saveRow}
                onDelete={() => remove(r.id)}
              />
            ))}
          </TableBody>
        </Table>
        {sorted.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            لا توجد تصنيفات. أضف صفاً من الأعلى.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ClassificationRowEditor({
  row,
  pending,
  onSave,
  onDelete,
}: {
  row: ClassificationRow;
  pending: boolean;
  onSave: (r: ClassificationRow, patch: Partial<ClassificationRow>) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(row.label);
  const [color, setColor] = useState(row.color);
  const [sortOrder, setSortOrder] = useState(String(row.sortOrder));
  const [isB, setIsB] = useState(row.isBRow);

  return (
    <TableRow>
      <TableCell className="w-24">
        <Input
          className="h-8 text-left"
          dir="ltr"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-8"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          dir="rtl"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            type="color"
            className="h-8 w-14 shrink-0 p-1"
            value={color.startsWith("#") ? color : "#64748b"}
            onChange={(e) => setColor(e.target.value)}
          />
          <Input
            className="h-8 flex-1 font-mono text-xs"
            dir="ltr"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
      </TableCell>
      <TableCell>
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={isB}
          onChange={(e) => setIsB(e.target.checked)}
        />
      </TableCell>
      <TableCell className="space-x-2 space-x-reverse">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            onSave(row, {
              label,
              color,
              sortOrder: Number(sortOrder) || 0,
              isBRow: isB,
            })
          }
        >
          حفظ
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (
              confirm(
                "حذف هذا التصنيف؟ سيُرفض النظام إذا كان مرتبطاً بعملاء."
              )
            )
              onDelete();
          }}
        >
          حذف
        </Button>
      </TableCell>
    </TableRow>
  );
}
