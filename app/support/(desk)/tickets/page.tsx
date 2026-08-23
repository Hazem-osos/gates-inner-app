import { SupportTicketsPageClient } from "@/components/helpdesk/support/tickets-page-client";
import { requireSupportSessionUser } from "@/lib/helpdesk/auth-helpers";

export const dynamic = "force-dynamic";

export default async function SupportTicketsPage() {
  const user = await requireSupportSessionUser();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">التذاكر</h1>
      <SupportTicketsPageClient isAdmin={user.supportRole === "ADMIN"} />
    </div>
  );
}
