import { requireSessionUser } from "@/lib/auth-helpers";

import { HeaderSystem } from "@/components/layout/header-system";

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
      <main className="flex-1">{children}</main>
    </div>
  );
}
