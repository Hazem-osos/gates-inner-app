import { requireSupportSessionUser } from "@/lib/helpdesk/auth-helpers";

import { SupportNav } from "@/components/helpdesk/support-nav";

export const dynamic = "force-dynamic";

export default async function SupportDeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSupportSessionUser();
  return (
    <div dir="rtl" className="min-h-full bg-muted/15">
      <SupportNav userName={user.name} role={user.supportRole} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
