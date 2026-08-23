import { requireSupportAdmin } from "@/lib/helpdesk/auth-helpers";

import { AdminAgentsClient } from "@/components/helpdesk/admin/agents-client";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage() {
  await requireSupportAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">إدارة الوكلاء</h1>
      <AdminAgentsClient />
    </div>
  );
}
