import { requireSupportAdmin } from "@/lib/helpdesk/auth-helpers";

import { AdminCustomersClient } from "@/components/helpdesk/admin/customers-client";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  await requireSupportAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">إدارة عملاء الدعم</h1>
      <AdminCustomersClient />
    </div>
  );
}
