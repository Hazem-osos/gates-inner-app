"use client";

import { CrmNav } from "@/components/layout/crm-nav";
import { CrmShortcutsRibbon } from "@/components/layout/crm-shortcuts-ribbon";
import type { UserRole } from "@prisma/client";

/**
 * هيكل موحّد: شريط التنقل + شريط اختصارات (أيقونات أكبر، عناوين، حركة خفيفة).
 * `sticky` حتى لا يحتاج المحتوى إلى `padding-top` ثابت.
 */
export function HeaderSystem({
  role,
  userName,
}: {
  role: UserRole;
  userName: string;
}) {
  return (
    <header
      dir="rtl"
      className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/70"
    >
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
        <CrmNav role={role} userName={userName} />
        <CrmShortcutsRibbon role={role} />
      </div>
    </header>
  );
}
