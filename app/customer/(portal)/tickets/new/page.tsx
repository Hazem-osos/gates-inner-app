import { VoiceTicketForm } from "@/components/helpdesk/customer/voice-ticket-form";
import {
  evaluateTicketCreation,
  licenseStatusMessage,
} from "@/lib/helpdesk/license";
import { getCustomerForSession } from "@/lib/helpdesk/auth-helpers";

export const dynamic = "force-dynamic";

export default async function CustomerNewTicketPage() {
  const customer = await getCustomerForSession();
  const eligibility = evaluateTicketCreation(customer);
  const warning = licenseStatusMessage(customer);
  const locked = !eligibility.ok;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">تذكرة دعم جديدة</h1>
      {!eligibility.ok && eligibility.reason === "expired_locked" ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          انتهت رخصة الدعم الفني ولا يمكن فتح تذاكر جديدة حتى يجددها مدير
          النظام.
        </p>
      ) : null}
      <VoiceTicketForm disabled={locked} licenseWarning={warning} />
    </div>
  );
}
