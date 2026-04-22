import { redirect } from "next/navigation";

import { UsersPasswordSettings } from "@/components/settings/users-password-settings";
import { PageHeader } from "@/components/layout/page-header";
import { isAdmin, requireSessionUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "المستخدمون وكلمة المرور",
  description: "عرض الحسابات وتغيير كلمات المرور — للمسؤول فقط",
};

export default async function SettingsUsersPage() {
  const user = await requireSessionUser();
  if (!isAdmin(user.role)) {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="المستخدمون وكلمة المرور"
        subtitle="للمسؤول فقط — عرض كل الحسابات وتعيين كلمة مرور جديدة لأي مستخدم (مثلاً بعد انصراف موظف)."
      />
      <UsersPasswordSettings users={users} />
    </div>
  );
}
