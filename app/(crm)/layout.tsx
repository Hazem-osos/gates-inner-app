import { requireSessionUser } from "@/lib/auth-helpers";

import { CrmNav } from "@/components/layout/crm-nav";

export const dynamic = "force-dynamic";

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionUser();

  return (
    <div dir="rtl" className="flex min-h-full flex-col">
      <CrmNav
        role={user.role}
        userName={user.name.trim() || user.email || "—"}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
