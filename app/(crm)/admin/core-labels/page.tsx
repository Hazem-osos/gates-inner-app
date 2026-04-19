import { CoreLabelsAdmin } from "@/components/admin/core-labels-admin";
import { PageHeader } from "@/components/layout/page-header";
import { isAdmin, requireSessionUser } from "@/lib/auth-helpers";
import { getAllCoreFieldLabelsForAdmin } from "@/lib/data/core-field-labels";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminCoreLabelsPage() {
  const user = await requireSessionUser();
  if (!isAdmin(user.role)) redirect("/dashboard");

  const rows = await getAllCoreFieldLabelsForAdmin();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="تسميات الحقول الأساسية"
        subtitle="تُستخدم في نماذج العملاء والتقارير دون تغيير أعمدة قاعدة البيانات."
      />
      <CoreLabelsAdmin rows={rows} />
    </div>
  );
}
