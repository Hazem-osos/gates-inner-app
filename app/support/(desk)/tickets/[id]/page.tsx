import { SupportTicketDetailClient } from "@/components/helpdesk/support/ticket-detail-client";
import { requireSupportSessionUser } from "@/lib/helpdesk/auth-helpers";

export const dynamic = "force-dynamic";

export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSupportSessionUser();
  const { id } = await params;
  return <SupportTicketDetailClient ticketId={id} role={user.supportRole} />;
}
