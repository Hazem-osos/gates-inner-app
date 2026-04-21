"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";

import { SignOutButton } from "@/components/layout/sign-out-button";
import {
  CRM_RIBBON_SHORTCUTS,
  crmRibbonShortcutIsActive,
  filterCrmNavByRole,
} from "@/lib/layout/crm-header-config";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

/** ألوان hover خفيفة لكل اختصار (يتكرر بالترتيب) */
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

export function HeaderSystem({
  role,
  userName,
}: {
  role: UserRole;
  userName: string;
}) {
  const pathname = usePathname();
  const shortcuts = filterCrmNavByRole(role, CRM_RIBBON_SHORTCUTS);

  return (
    <header
      dir="rtl"
      className="fixed inset-x-0 top-0 z-50 w-full border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="mx-auto max-w-[1600px]">
        {/* Row 1 — شريط علوي */}
        <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2.5 rounded-lg py-1 text-slate-900 transition-colors hover:text-slate-600 dark:text-slate-100 dark:hover:text-slate-300"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <UserRound className="size-4" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col text-start leading-tight">
              <span className="truncate text-sm font-semibold tracking-tight">
                إدارة العملاء
              </span>
              <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                لوحة المتابعة
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div
              className="hidden max-w-[14rem] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-1.5 sm:flex dark:border-slate-800 dark:bg-slate-900/60"
              aria-label={`مرحباً ${userName}`}
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                aria-hidden
              >
                <UserRound className="size-3.5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 text-start">
                <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  مرحباً
                </span>
                <span className="block truncate text-xs font-semibold text-slate-900 dark:text-slate-50">
                  {userName}
                </span>
              </span>
            </div>
            <div className="flex sm:hidden" aria-hidden>
              <span className="flex size-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <UserRound className="size-3.5" strokeWidth={1.75} />
              </span>
            </div>
            <SignOutButton className="h-9 rounded-lg px-3 text-xs" />
          </div>
        </div>

        {/* Row 2 — شريط الاختصارات */}
        {shortcuts.length > 0 ? (
          <nav
            className="flex h-11 items-center gap-1 overflow-x-auto border-b border-slate-100 px-4 dark:border-slate-800 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="اختصارات سريعة"
          >
            {shortcuts.map(({ href, label, Icon }, index) => {
              const active = crmRibbonShortcutIsActive(pathname, href);
              const tint =
                RIBBON_HOVER_TINTS[index % RIBBON_HOVER_TINTS.length]!;
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
        ) : (
          <div
            className="h-11 border-b border-slate-100 dark:border-slate-800"
            aria-hidden
          />
        )}
      </div>
    </header>
  );
}
