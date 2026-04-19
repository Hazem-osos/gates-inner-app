import { redirect } from "next/navigation";

import { ClassificationsSettings } from "@/components/settings/classifications-settings";
import { PageHeader } from "@/components/layout/page-header";
import { isManagerOrAdmin, requireSessionUser } from "@/lib/auth-helpers";
import { listClientClassifications } from "@/lib/data/classifications";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "تصنيفات العملاء",
  description: "إدارة تصنيفات العميل الظاهرة في النماذج والتقارير",
};

export default async function FieldLabelsSettingsPage() {
  const user = await requireSessionUser();
  if (!isManagerOrAdmin(user.role)) {
    redirect("/dashboard");
  }

  const rows = await listClientClassifications();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="تصنيفات العميل"
        subtitle="تعديل الاسم واللون، الإضافة، والحذف مع التحذير عند وجود عملاء مرتبطين."
      />
      <ClassificationsSettings initialRows={rows} />
    </div>
  );
}
