import { requireSessionUser } from "@/lib/auth-helpers";

import { HeaderSystem } from "@/components/layout/header-system";
import { HEADER_SYSTEM_OFFSET_CLASS } from "@/lib/layout/crm-header-config";

export const dynamic = "force-dynamic";

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionUser();

  return (
    <div dir="rtl" className="flex min-h-full flex-col">
      <HeaderSystem
        role={user.role}
        userName={user.name.trim() || user.email || "—"}
      />
      <main className={`flex-1 ${HEADER_SYSTEM_OFFSET_CLASS}`}>
        {children}
      </main>
    </div>
  );
}
