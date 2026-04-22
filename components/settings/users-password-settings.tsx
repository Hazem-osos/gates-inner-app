"use client";

import type { UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { adminSetUserPasswordAction } from "@/app/actions/admin-user-password";
import {
  adminRestoreUserAction,
  adminSetUserActiveAction,
  adminSoftDeleteUserAction,
} from "@/app/actions/admin-user-lifecycle";
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
import { DELETED_USER_LABEL_AR } from "@/lib/user-display-name";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  deletedAt: Date | string | null;
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

function statusLabel(u: AdminUserRow) {
  if (u.deletedAt) {
    return (
      <span className="font-medium text-destructive">محذوف ناعم</span>
    );
  }
  if (u.isActive) {
    return (
      <span className="text-emerald-700 dark:text-emerald-400">نشط</span>
    );
  }
  return <span className="text-muted-foreground">موقوف</span>;
}

export function UsersPasswordSettings({
  currentUserId,
  users,
}: {
  currentUserId: string;
  users: AdminUserRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();

  function refresh() {
    router.refresh();
  }

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

  function setActive(u: AdminUserRow, isActive: boolean) {
    start(async () => {
      const res = await adminSetUserActiveAction({ userId: u.id, isActive });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(isActive ? "تم التفعيل." : "تم الإيقاف.");
      refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    start(async () => {
      const res = await adminSoftDeleteUserAction({ userId: deleteTarget.id });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        `تم الحذف الناعم. سيظهر «${DELETED_USER_LABEL_AR}» في السجلات المرتبطة.`
      );
      setDeleteOpen(false);
      setDeleteTarget(null);
      refresh();
    });
  }

  function restore(u: AdminUserRow) {
    start(async () => {
      const res = await adminRestoreUserAction({
        userId: u.id,
        isActive: true,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("تمت استعادة الحساب. يمكنك تعديل التفعيل لاحقاً.");
      refresh();
    });
  }

  return (
    <>
      <p className="text-sm text-muted-foreground" dir="rtl">
        <strong>الإيقاف</strong> يمنع تسجيل الدخول دون فقدان السجلات.{" "}
        <strong>الحذف الناعم</strong> نفسه + علامة «{DELETED_USER_LABEL_AR}» في التقارير
        وعدم إظهار المستخدم في قوائم المندوبين.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-start">الاسم</TableHead>
              <TableHead className="text-start">البريد</TableHead>
              <TableHead className="w-[100px] text-center">الدور</TableHead>
              <TableHead className="w-[120px] text-center">الحالة</TableHead>
              <TableHead className="min-w-[220px] text-center">إدارة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  لا يوجد مستخدمون.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <TableRow
                    key={u.id}
                    className={u.deletedAt ? "opacity-90" : undefined}
                  >
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell dir="ltr" className="text-start text-sm">
                      {u.email}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {roleLabelAr(u.role)}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {statusLabel(u)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {!u.deletedAt ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => openFor(u)}
                            >
                              كلمة المرور
                            </Button>
                            {u.isActive && !isSelf ? (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="text-xs"
                                disabled={pending}
                                onClick={() => setActive(u, false)}
                              >
                                إيقاف
                              </Button>
                            ) : null}
                            {!u.isActive ? (
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="text-xs"
                                disabled={pending}
                                onClick={() => setActive(u, true)}
                              >
                                تفعيل
                              </Button>
                            ) : null}
                            {!isSelf ? (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="text-xs"
                                disabled={pending}
                                onClick={() => {
                                  setDeleteTarget(u);
                                  setDeleteOpen(true);
                                }}
                              >
                                حذف ناعم
                              </Button>
                            ) : null}
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            disabled={pending}
                            onClick={() => restore(u)}
                          >
                            استعادة
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={pending}
            >
              {pending ? "جاري الحفظ…" : "حفظ"}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-muted-foreground">
          الحد الأدنى 8 أحرف.
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

      <SimpleDialog
        open={deleteOpen}
        onOpenChange={(v) => {
          setDeleteOpen(v);
          if (!v) setDeleteTarget(null);
        }}
        title="تأكيد حذف ناعم"
        contentClassName="max-w-md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteTarget(null);
              }}
              disabled={pending}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={pending}
            >
              {pending ? "…" : "تأكيد الحذف"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground" dir="rtl">
          سيتم إيقاف الحساب ولن يظهر المستخدم في قوائم المندوبين. العملاء
          والتقارير تبقى مرتبطة ويظهر «{DELETED_USER_LABEL_AR}» بدل الاسم
          {deleteTarget ? (
            <>
              {" "}
              لـ <span className="font-medium text-foreground">{deleteTarget.name}</span>.
            </>
          ) : null}
        </p>
      </SimpleDialog>
    </>
  );
}
