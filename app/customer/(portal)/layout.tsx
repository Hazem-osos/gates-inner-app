import { requireCustomerSessionUser } from "@/lib/helpdesk/auth-helpers";

import { CustomerNav } from "@/components/helpdesk/customer-nav";

export const dynamic = "force-dynamic";

export default async function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCustomerSessionUser();
  return (
    <div dir="rtl" className="min-h-full bg-muted/15">
      <CustomerNav userName={user.name} companyName={user.companyName} />
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
