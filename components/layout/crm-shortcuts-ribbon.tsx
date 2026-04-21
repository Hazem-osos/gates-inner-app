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

const RIBBON_HOVER_TINTS = [
  {
    wrap: "hover:bg-sky-50/90 dark:hover:bg-sky-900/25",
    icon: "group-hover:text-sky-600 dark:group-hover:text-sky-400",
  },
  {
    wrap: "hover:bg-emerald-50/90 dark:hover:bg-emerald-900/25",
    icon: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
  },
  {
    wrap: "hover:bg-violet-50/90 dark:hover:bg-violet-900/25",
    icon: "group-hover:text-violet-600 dark:group-hover:text-violet-400",
  },
  {
    wrap: "hover:bg-amber-50/90 dark:hover:bg-amber-900/25",
    icon: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
  },
  {
    wrap: "hover:bg-rose-50/90 dark:hover:bg-rose-900/25",
    icon: "group-hover:text-rose-600 dark:group-hover:text-rose-400",
  },
  {
    wrap: "hover:bg-cyan-50/90 dark:hover:bg-cyan-900/25",
    icon: "group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
  },
  {
    wrap: "hover:bg-indigo-50/90 dark:hover:bg-indigo-900/25",
    icon: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
  },
  {
    wrap: "hover:bg-blue-50/90 dark:hover:bg-blue-900/25",
    icon: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
  },
] as const;

/** شريط الأيقونات مع التلميح تحت كل أيقونة — كما في التصميم الحالي */
export function CrmShortcutsRibbon({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const shortcuts = filterCrmNavByRole(role, CRM_RIBBON_SHORTCUTS);

  if (shortcuts.length === 0) {
    return (
      <div
        className="h-11 border-t border-border/50 bg-muted/20 dark:bg-muted/10"
        aria-hidden
      />
    );
  }

  return (
    <nav
      className="flex h-11 items-center gap-1 overflow-x-auto border-t border-border/50 bg-muted/20 dark:bg-muted/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="اختصارات سريعة"
    >
      {shortcuts.map(({ href, label, Icon }, index) => {
        const active = crmRibbonShortcutIsActive(pathname, href);
        const tint = RIBBON_HOVER_TINTS[index % RIBBON_HOVER_TINTS.length]!;
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            title={label}
            className={cn(
              "group relative flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-200 dark:text-slate-400",
              "hover:text-slate-700 dark:hover:text-slate-200",
              tint.wrap,
              tint.icon,
              active &&
                "bg-slate-100 text-slate-900 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-50 dark:ring-slate-700"
            )}
          >
            <Icon
              className="size-[1.05rem] shrink-0 sm:size-4"
              strokeWidth={1.85}
              aria-hidden
            />
            <span
              className="pointer-events-none absolute start-1/2 top-[calc(100%+8px)] z-[60] -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-800 opacity-0 shadow-md ring-1 ring-slate-950/5 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:ring-white/10"
              role="tooltip"
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
