"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Sparkles, UserPlus, Users } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type ShortcutAccent = {
  iconWrap: string;
  iconClass: string;
};

type Shortcut = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: ShortcutAccent;
};

const ACCENT_PRESETS: ShortcutAccent[] = [
  {
    iconWrap: "bg-blue-100 dark:bg-blue-900/30",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  {
    iconWrap: "bg-emerald-100 dark:bg-emerald-900/30",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    iconWrap: "bg-amber-100 dark:bg-amber-900/30",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  {
    iconWrap: "bg-violet-100 dark:bg-violet-900/30",
    iconClass: "text-violet-600 dark:text-violet-400",
  },
  {
    iconWrap: "bg-rose-100 dark:bg-rose-900/30",
    iconClass: "text-rose-600 dark:text-rose-400",
  },
];

const SHORTCUTS: Omit<Shortcut, "accent">[] = [
  {
    href: "/clients/new",
    label: "إضافة عميل جديد",
    description: "تسجيل عميل في النظام",
    icon: UserPlus,
  },
  {
    href: "/clients",
    label: "قاعدة العملاء",
    description: "قائمة وبحث العملاء",
    icon: Users,
  },
  {
    href: "/reports/b",
    label: "التقارير",
    description: "تقارير المبيعات والعملاء",
    icon: BarChart3,
  },
  {
    href: "/reports/recommendations",
    label: "توصيات الإدارة",
    description: "متابعة توصيات الإدارة",
    icon: Sparkles,
  },
];

const WITH_ACCENTS: Shortcut[] = SHORTCUTS.map((s, i) => ({
  ...s,
  accent: ACCENT_PRESETS[i % ACCENT_PRESETS.length]!,
}));

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
    },
  },
};

const hoverLift = {
  y: -2,
  transition: { duration: 0.28 },
};

export function DashboardShortcuts() {
  return (
    <section
      dir="rtl"
      className="w-full rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-4"
      aria-labelledby="dashboard-shortcuts-heading"
    >
      <div className="mb-3 md:mb-4">
        <h2
          id="dashboard-shortcuts-heading"
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-xl"
        >
          الوصول السريع
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 md:text-sm">
          انتقالات سريعة إلى أهم أجزاء النظام
        </p>
      </div>

      <motion.ul
        className="grid w-full grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {WITH_ACCENTS.map((s) => {
          const Icon = s.icon;
          return (
            <motion.li
              key={s.href}
              variants={cardVariants}
              className="min-w-0 list-none"
              whileHover={hoverLift}
            >
              <Link
                href={s.href}
                title={s.label}
                aria-label={`${s.label} — ${s.description}`}
                className={cn(
                  "group relative flex h-full min-h-[6.5rem] flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900",
                  "hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700 dark:hover:shadow-md dark:hover:shadow-black/20",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-slate-500/40 dark:focus-visible:ring-offset-slate-900"
                )}
              >
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl md:size-12",
                    s.accent.iconWrap
                  )}
                >
                  <Icon
                    className={cn("size-5 md:size-[1.35rem]", s.accent.iconClass)}
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 dark:text-slate-50 md:text-base">
                    {s.label}
                  </p>
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 md:text-xs">
                    {s.description}
                  </p>
                </div>

                <span
                  className="pointer-events-none absolute start-1/2 top-full z-10 mt-1.5 -translate-x-1/2 max-w-[min(18rem,calc(100vw-2rem))] whitespace-normal rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-center text-xs font-semibold leading-snug text-slate-900 opacity-0 shadow-md ring-1 ring-slate-950/[0.04] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:ring-white/10"
                  aria-hidden
                >
                  {s.label}
                </span>
              </Link>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}
