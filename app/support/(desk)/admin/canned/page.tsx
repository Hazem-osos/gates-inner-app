import { requireSupportAdmin } from "@/lib/helpdesk/auth-helpers";

import { AdminCannedClient } from "@/components/helpdesk/admin/canned-client";

export const dynamic = "force-dynamic";

export default async function AdminCannedPage() {
  await requireSupportAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">الرسائل الجاهزة</h1>
      <AdminCannedClient />
    </div>
  );
}
