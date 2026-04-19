import { CustomFieldsAdmin } from "@/components/admin/custom-fields-admin";
import { PageHeader } from "@/components/layout/page-header";
import { requireSessionUser, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminCustomFieldsPage() {
  const user = await requireSessionUser();
  if (!isAdmin(user.role)) redirect("/dashboard");

  const definitions = await prisma.customFieldDefinition.findMany({
    orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="الحقول المخصصة"
        subtitle="إدارة الحقول الديناميكية في نماذج العملاء."
      />
      <CustomFieldsAdmin definitions={definitions} />
    </div>
  );
}
