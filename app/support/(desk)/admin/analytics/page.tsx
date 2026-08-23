import { requireSupportAdmin } from "@/lib/helpdesk/auth-helpers";

import { AdminAnalyticsClient } from "@/components/helpdesk/admin/analytics-client";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireSupportAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">رضا العملاء (CSAT)</h1>
      <AdminAnalyticsClient />
    </div>
  );
}
