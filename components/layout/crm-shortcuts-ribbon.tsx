"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CRM_RIBBON_SHORTCUTS,
  crmRibbonShortcutIsActive,
  filterCrmNavByRole,
} from "@/lib/layout/crm-header-config";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

/** تدرجات بسيطة للأيقونات */
const TINTS = [
  { hover: "hover:bg-sky-50/80 dark:hover:bg-sky-950/40", text: "text-sky-600 dark:text-sky-400" },
  { hover: "hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400" },
  { hover: "hover:bg-violet-50/80 dark:hover:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400" },
  { hover: "hover:bg-amber-50/80 dark:hover:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400" },
  { hover: "hover:bg-rose-50/80 dark:hover:bg-rose-950/40", text: "text-rose-600 dark:text-rose-400" },
  { hover: "hover:bg-cyan-50/80 dark:hover:bg-cyan-950/40", text: "text-cyan-600 dark:text-cyan-400" },
  { hover: "hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-400" },
  { hover: "hover:bg-blue-50/80 dark:hover:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400" },
] as const;

export function CrmShortcutsRibbon({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const shortcuts = filterCrmNavByRole(role, CRM_RIBBON_SHORTCUTS);

  if (shortcuts.length === 0) {
    return (
      <div
        className="h-8 border-t border-border/50 bg-muted/15"
        aria-hidden
      />
    );
  }

  return (
    <nav
      className="border-t border-border/50 bg-muted/20 py-0.5 dark:bg-muted/10"
      aria-label="اختصارات سريعة"
    >
      <div
        className="flex min-h-8 items-stretch gap-0.5 overflow-x-auto overflow-y-hidden py-0.5 pl-0.5 pr-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] sm:min-h-9 sm:gap-1 sm:px-0 sm:py-1 [&::-webkit-scrollbar]:hidden"
      >
        {shortcuts.map(({ href, label, Icon, ribbonMark }, index) => {
          const active = crmRibbonShortcutIsActive(pathname, href);
          const tint = TINTS[index % TINTS.length]!;

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              title={label}
              className={cn(
                "group flex min-w-[2.75rem] shrink-0 flex-col items-center justify-center gap-px rounded-md px-0.5 py-0.5 text-center sm:min-w-[3rem] sm:px-1",
                "transition duration-200 hover:-translate-y-px active:scale-[0.98]",
                active
                  ? "bg-background shadow-sm ring-1 ring-border/80 dark:bg-background/80"
                  : "hover:ring-1 hover:ring-border/40",
                !active && tint.hover
              )}
            >
              <span
                className={cn(
                  "flex h-[1.35rem] w-[1.35rem] items-center justify-center sm:h-6 sm:w-6",
                  "rounded border border-transparent transition-colors",
                  active && "border-border/60 bg-muted/50"
                )}
              >
                {ribbonMark ? (
                  <span
                    className={cn(
                      "select-none text-[0.6rem] font-black leading-none sm:text-[0.7rem]",
                      tint.text
                    )}
                    aria-hidden
                  >
                    {ribbonMark}
                  </span>
                ) : Icon ? (
                  <Icon
                    className={cn(
                      "size-3 sm:size-3.5",
                      active ? "text-foreground" : tint.text
                    )}
                    strokeWidth={1.85}
                    aria-hidden
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "line-clamp-1 max-w-[2.6rem] text-[0.45rem] font-medium leading-tight text-muted-foreground",
                  "sm:max-w-[3rem] sm:text-[0.5rem] sm:leading-none",
                  "group-hover:text-foreground/90",
                  active && "text-foreground"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
