import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { BackupManager } from "@/components/settings/backup-manager";
import { isAdmin, requireSessionUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "نسخ احتياطي للقاعدة",
  description: "تصدير واسترجاع MySQL — للمسؤول فقط",
};

export default async function DatabaseBackupSettingsPage() {
  const user = await requireSessionUser();
  if (!isAdmin(user.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="نسخ احتياطي واسترجاع القاعدة"
        subtitle="للمسؤول فقط — يعتمد على mysqldump و mysql على الخادم."
      />
      <BackupManager />
    </div>
  );
}
