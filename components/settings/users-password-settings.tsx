"use client";

import type { UserRole } from "@prisma/client";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { adminSetUserPasswordAction } from "@/app/actions/admin-user-password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

function roleLabelAr(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "أدمن";
    case "MANAGER":
      return "مدير";
    case "SALES":
      return "سيلز";
    default:
      return role;
  }
}

export function UsersPasswordSettings({ users }: { users: AdminUserRow[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();

  function openFor(u: AdminUserRow) {
    setSelected(u);
    setPassword("");
    setConfirm("");
    setOpen(true);
  }

  function submit() {
    if (!selected) return;
    start(async () => {
      const res = await adminSetUserPasswordAction({
        userId: selected.id,
        newPassword: password,
        confirmPassword: confirm,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("تم تحديث كلمة المرور.");
      setOpen(false);
      setSelected(null);
      setPassword("");
      setConfirm("");
    });
  }

  return (
    <>
      <div className="rounded-xl border border-border/80 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-start">الاسم</TableHead>
              <TableHead className="text-start">البريد</TableHead>
              <TableHead className="w-[100px] text-center">الدور</TableHead>
              <TableHead className="w-[90px] text-center">الحالة</TableHead>
              <TableHead className="w-[140px] text-center">إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  لا يوجد مستخدمون.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell dir="ltr" className="text-start text-sm">
                    {u.email}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {roleLabelAr(u.role)}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {u.isActive ? (
                      <span className="text-emerald-700 dark:text-emerald-400">نشط</span>
                    ) : (
                      <span className="text-muted-foreground">موقوف</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => openFor(u)}
                    >
                      تغيير كلمة المرور
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SimpleDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setSelected(null);
            setPassword("");
            setConfirm("");
          }
        }}
        title={
          selected
            ? `كلمة مرور جديدة — ${selected.name}`
            : "تغيير كلمة المرور"
        }
        contentClassName="max-w-md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              إلغاء
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={pending}>
              {pending ? "جاري الحفظ…" : "حفظ"}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-muted-foreground">
          بعد انصراف موظف، غيّر كلمة مرور حسابه فوراً. الحد الأدنى 8 أحرف.
        </p>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="admin-new-pass">كلمة المرور الجديدة</Label>
            <Input
              id="admin-new-pass"
              type="password"
              autoComplete="new-password"
              dir="ltr"
              className="text-left"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-confirm-pass">تأكيد كلمة المرور</Label>
            <Input
              id="admin-confirm-pass"
              type="password"
              autoComplete="new-password"
              dir="ltr"
              className="text-left"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
      </SimpleDialog>
    </>
  );
}
