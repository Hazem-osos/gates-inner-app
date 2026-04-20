"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type Shortcut = {
  href: string;
  label: string;
  description: string;
  icon: typeof Users;
  gradient: string;
  shadowTint: string;
};

const SHORTCUTS: Shortcut[] = [
  {
    href: "/clients/new",
    label: "إضافة عميل جديد",
    description: "تسجيل عميل في النظام",
    icon: UserPlus,
    gradient: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-400",
    shadowTint: "shadow-emerald-500/40",
  },
  {
    href: "/clients",
    label: "قاعدة العملاء",
    description: "قائمة وبحث العملاء",
    icon: Users,
    gradient: "bg-gradient-to-br from-blue-600 via-indigo-500 to-cyan-400",
    shadowTint: "shadow-blue-500/40",
  },
  {
    href: "/dashboard#dashboard-today-followups",
    label: "متابعات اليوم",
    description: "انتقال سريع للجدول",
    icon: CalendarDays,
    gradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500",
    shadowTint: "shadow-amber-500/40",
  },
  {
    href: "/reports/b",
    label: "التقارير",
    description: "تقارير المبيعات والعملاء",
    icon: BarChart3,
    gradient: "bg-gradient-to-br from-violet-600 via-purple-500 to-fuchsia-500",
    shadowTint: "shadow-purple-500/40",
  },
  {
    href: "/reports/recommendations",
    label: "توصيات الإدارة",
    description: "متابعة توصيات الإدارة",
    icon: Sparkles,
    gradient: "bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400",
    shadowTint: "shadow-rose-500/40",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 420,
      damping: 26,
    },
  },
};

export function DashboardShortcuts() {
  return (
    <section
      dir="rtl"
      className="w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/5 via-background to-slate-800/5 p-4 shadow-inner ring-1 ring-border/40 dark:from-slate-950/40 dark:via-background dark:to-slate-900/30 md:p-6"
      aria-labelledby="dashboard-shortcuts-heading"
    >
      <div className="mb-4 flex flex-col gap-1 md:mb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            id="dashboard-shortcuts-heading"
            className="text-xl font-bold tracking-tight text-foreground md:text-2xl"
          >
            الوصول السريع
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            اختصارات ملوّنة للوصول الأسرع إلى أهم الصفحات
          </p>
        </div>
      </div>

      <motion.ul
        className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 lg:gap-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {SHORTCUTS.map((s) => {
          const Icon = s.icon;
          return (
            <motion.li
              key={s.href}
              variants={cardVariants}
              className="min-w-0 list-none"
              whileHover={{
                scale: 1.05,
                y: -5,
                transition: { type: "spring", stiffness: 400, damping: 22 },
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href={s.href}
                className={cn(
                  "relative flex min-h-[7.5rem] flex-col justify-between overflow-hidden rounded-2xl p-5 text-white shadow-lg ring-1 ring-white/25 transition-shadow duration-300 md:min-h-[8.5rem] md:p-6 md:pb-5",
                  s.gradient,
                  s.shadowTint,
                  "hover:shadow-xl hover:ring-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
              >
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -end-6 -top-6 size-24 rounded-full bg-white/15 blur-2xl"
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-2">
                  <span className="rounded-xl bg-white/15 p-2.5 shadow-inner ring-1 ring-white/30 backdrop-blur-sm md:p-3">
                    <Icon
                      className="size-8 shrink-0 text-white drop-shadow-md md:size-10"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                </div>
                <div className="relative mt-4 space-y-1">
                  <span className="block text-base font-bold leading-tight text-white drop-shadow-sm md:text-lg">
                    {s.label}
                  </span>
                  <span className="block text-xs font-medium text-white/85 md:text-sm">
                    {s.description}
                  </span>
                </div>
              </Link>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}
