"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

import {
  CRM_RIBBON_SHORTCUTS,
  crmRibbonShortcutIsActive,
  filterCrmNavByRole,
} from "@/lib/layout/crm-header-config";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

const RIBBON_ACCENT = [
  {
    glow: "from-sky-400/20 to-cyan-500/5",
    ring: "group-hover:ring-sky-400/35",
    active: "ring-sky-500/50 shadow-[0_0_20px_-4px] shadow-sky-500/30",
    icon: "text-sky-600 dark:text-sky-300",
  },
  {
    glow: "from-emerald-400/20 to-teal-500/5",
    ring: "group-hover:ring-emerald-400/35",
    active: "ring-emerald-500/50 shadow-[0_0_20px_-4px] shadow-emerald-500/30",
    icon: "text-emerald-600 dark:text-emerald-300",
  },
  {
    glow: "from-violet-400/20 to-fuchsia-500/5",
    ring: "group-hover:ring-violet-400/35",
    active: "ring-violet-500/50 shadow-[0_0_20px_-4px] shadow-violet-500/30",
    icon: "text-violet-600 dark:text-violet-300",
  },
  {
    glow: "from-amber-400/20 to-orange-500/5",
    ring: "group-hover:ring-amber-400/35",
    active: "ring-amber-500/50 shadow-[0_0_20px_-4px] shadow-amber-500/30",
    icon: "text-amber-600 dark:text-amber-300",
  },
  {
    glow: "from-rose-400/20 to-pink-500/5",
    ring: "group-hover:ring-rose-400/35",
    active: "ring-rose-500/50 shadow-[0_0_20px_-4px] shadow-rose-500/30",
    icon: "text-rose-600 dark:text-rose-300",
  },
  {
    glow: "from-cyan-400/20 to-sky-500/5",
    ring: "group-hover:ring-cyan-400/35",
    active: "ring-cyan-500/50 shadow-[0_0_20px_-4px] shadow-cyan-500/30",
    icon: "text-cyan-600 dark:text-cyan-300",
  },
  {
    glow: "from-indigo-400/20 to-blue-500/5",
    ring: "group-hover:ring-indigo-400/35",
    active: "ring-indigo-500/50 shadow-[0_0_20px_-4px] shadow-indigo-500/30",
    icon: "text-indigo-600 dark:text-indigo-300",
  },
  {
    glow: "from-blue-400/20 to-indigo-500/5",
    ring: "group-hover:ring-blue-400/35",
    active: "ring-blue-500/50 shadow-[0_0_20px_-4px] shadow-blue-500/30",
    icon: "text-blue-600 dark:text-blue-300",
  },
] as const;

export function CrmShortcutsRibbon({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const shortcuts = filterCrmNavByRole(role, CRM_RIBBON_SHORTCUTS);

  const { container, item } = useMemo(() => {
    const spring = {
      type: "spring" as const,
      stiffness: 480,
      damping: 34,
    };
    return {
      container: {
        hidden: { opacity: reduceMotion ? 1 : 0.92 },
        show: {
          opacity: 1,
          transition: reduceMotion
            ? { duration: 0 }
            : { staggerChildren: 0.045, delayChildren: 0.04 },
        },
      },
      item: {
        hidden: reduceMotion
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 10 },
        show: {
          opacity: 1,
          y: 0,
          transition: reduceMotion ? { duration: 0 } : spring,
        },
      },
    };
  }, [reduceMotion]);

  if (shortcuts.length === 0) {
    return (
      <div
        className="h-[4.5rem] border-t border-border/50 bg-gradient-to-b from-muted/30 to-transparent dark:from-muted/15"
        aria-hidden
      />
    );
  }

  return (
    <nav
      className="relative border-t border-border/40 bg-gradient-to-b from-primary/[0.04] via-muted/25 to-background/80 py-2.5 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.06)] backdrop-blur-[2px] dark:from-primary/[0.08] dark:via-muted/15 dark:shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.03)]"
      aria-label="اختصارات سريعة"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-primary/20 to-transparent"
        aria-hidden
      />
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex min-h-[4.5rem] items-stretch gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth px-1 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 sm:px-0 [&::-webkit-scrollbar]:hidden"
        style={{ willChange: "transform" }}
      >
        {shortcuts.map(({ href, label, Icon, ribbonMark }, index) => {
          const active = crmRibbonShortcutIsActive(pathname, href);
          const accent = RIBBON_ACCENT[index % RIBBON_ACCENT.length]!;

          return (
            <motion.div
              key={href}
              variants={item}
              className="flex shrink-0"
              whileHover={
                reduceMotion
                  ? undefined
                  : { y: -2, transition: { type: "spring", stiffness: 500, damping: 28 } }
              }
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            >
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                title={label}
                className={cn(
                  "group relative flex min-w-[4.1rem] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-1.5 text-center sm:min-w-[5rem] sm:px-2.5 sm:py-2",
                  "outline-none transition-shadow duration-300 focus-visible:ring-2 focus-visible:ring-primary/50",
                  "before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/50 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 dark:before:from-white/[0.04]",
                  active
                    ? cn(
                        "ring-1 ring-border/60",
                        "bg-background/80 dark:bg-background/60",
                        accent.active
                      )
                    : "ring-0 ring-transparent hover:ring-1 hover:ring-border/50"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:h-12 sm:w-12",
                    "border border-border/50 bg-gradient-to-br shadow-sm",
                    "from-background to-muted/50 dark:from-slate-900/80 dark:to-slate-950/90",
                    "transition-all duration-300 group-hover:border-border group-hover:shadow-md",
                    !active && accent.ring,
                    active && "border-primary/25",
                    active && "bg-gradient-to-br",
                    active && accent.glow
                  )}
                >
                  <span
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition duration-700 ease-out group-hover:translate-x-full group-hover:opacity-100 dark:via-white/10"
                    aria-hidden
                  />
                  {ribbonMark ? (
                    <span
                      className={cn(
                        "select-none text-base font-black leading-none tracking-tight sm:text-lg",
                        accent.icon
                      )}
                      aria-hidden
                    >
                      {ribbonMark}
                    </span>
                  ) : Icon ? (
                    <Icon
                      className={cn(
                        "relative z-[1] size-5 sm:size-6",
                        accent.icon
                      )}
                      strokeWidth={2.1}
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "line-clamp-2 max-w-[5.2rem] text-[0.6rem] font-medium leading-tight text-muted-foreground",
                    "transition-colors duration-200 sm:max-w-[5.5rem] sm:text-[0.7rem]",
                    "group-hover:text-foreground",
                    active && "text-foreground"
                  )}
                >
                  {label}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </nav>
  );
}
