import { requireSupportAdmin } from "@/lib/helpdesk/auth-helpers";

import { AdminAuditClient } from "@/components/helpdesk/admin/audit-client";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireSupportAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">تدقيق إغلاق التذاكر</h1>
      <AdminAuditClient />
    </div>
  );
}
