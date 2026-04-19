"use client";

import * as React from "react";

import type { CoreFieldLabel } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { updateCoreFieldLabelAction } from "@/app/actions/admin-fields";
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

export function CoreLabelsAdmin({ rows }: { rows: CoreFieldLabel[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function save(
    row: CoreFieldLabel,
    labelAr: string,
    visible: boolean,
    sortOrder: number
  ) {
    startTransition(async () => {
      const res = await updateCoreFieldLabelAction({
        id: row.id,
        labelAr,
        visible,
        sortOrder,
      });
      if (res.ok) {
        toast.success("تم التحديث");
        router.refresh();
      } else toast.error(res.message);
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>المفتاح</TableHead>
          <TableHead>التسمية العربية</TableHead>
          <TableHead>ظاهر</TableHead>
          <TableHead>ترتيب</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <CoreLabelRow
            key={row.id}
            row={row}
            onSave={save}
            disabled={pending}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function CoreLabelRow({
  row,
  onSave,
  disabled,
}: {
  row: CoreFieldLabel;
  onSave: (
    row: CoreFieldLabel,
    labelAr: string,
    visible: boolean,
    sortOrder: number
  ) => void;
  disabled: boolean;
}) {
  const [labelAr, setLabelAr] = React.useState(row.labelAr);
  const [visible, setVisible] = React.useState(row.visible);
  const [sortOrder, setSortOrder] = React.useState(row.sortOrder);

  return (
    <TableRow>
      <TableCell dir="ltr" className="font-mono text-xs">
        {row.fieldKey}
      </TableCell>
      <TableCell>
        <Input
          dir="rtl"
          value={labelAr}
          onChange={(e) => setLabelAr(e.target.value)}
        />
      </TableCell>
      <TableCell>
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          className="w-20 text-left"
          dir="ltr"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
      </TableCell>
      <TableCell>
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() => onSave(row, labelAr, visible, sortOrder)}
        >
          حفظ
        </Button>
      </TableCell>
    </TableRow>
  );
}
