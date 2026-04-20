"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  ChevronDown,
  ClipboardList,
  Database,
  Flame,
  LayoutDashboard,
  PhoneCall,
  SlidersHorizontal,
  Table2,
  Tags,
  Trophy,
  Type,
  UserPlus,
  Users,
  UsersRound,
  UserRound,
  UserX,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

import { SignOutButton } from "./sign-out-button";

type NavLink = {
  href: string;
  label: string;
  adminOnly?: boolean;
  managerPlus?: boolean;
};

const primaryLinks: NavLink[] = [
  { href: "/dashboard", label: "لوحة إرشادية" },
  { href: "/clients", label: "العملاء" },
  { href: "/clients/new", label: "إضافة عميل" },
];

const reportLinks: NavLink[] = [
  { href: "/reports/b", label: "تقرير عملاء B" },
  { href: "/reports/not-b", label: "تقرير Not B" },
  { href: "/reports/closed", label: "عملاء مغلقة" },
  { href: "/reports/won", label: "تم البيع" },
  { href: "/reports/recommendations", label: "توصيات الإدارة" },
  { href: "/reports/calls", label: "عملاء جدد / المواعيد" },
  { href: "/reports/warming", label: "أدوات Warming" },
  { href: "/reports/transferred", label: "عملاء منقولة" },
];

const tailLinks: NavLink[] = [
  {
    href: "/settings/field-labels",
    label: "تصنيفات العملاء",
    managerPlus: true,
  },
  {
    href: "/settings/backup",
    label: "نسخ احتياطي للقاعدة",
    adminOnly: true,
  },
  { href: "/admin/custom-fields", label: "الحقول المخصصة", adminOnly: true },
  { href: "/admin/core-labels", label: "تسميات الحقول", adminOnly: true },
];

type NavShortcut = {
  href: string;
  label: string;
  Icon: LucideIcon;
  adminOnly?: boolean;
  managerPlus?: boolean;
};

/** أيقونات سريعة تحت القائمة — التمرير يعرض الاسم (title) */
const navShortcuts: NavShortcut[] = [
  { href: "/dashboard", label: "لوحة إرشادية", Icon: LayoutDashboard },
  { href: "/clients", label: "العملاء", Icon: Users },
  { href: "/clients/new", label: "إضافة عميل", Icon: UserPlus },
  { href: "/reports/b", label: "تقرير عملاء B", Icon: Table2 },
  { href: "/reports/not-b", label: "تقرير Not B", Icon: UsersRound },
  { href: "/reports/closed", label: "عملاء مغلقة", Icon: UserX },
  { href: "/reports/won", label: "تم البيع", Icon: Trophy },
  {
    href: "/reports/recommendations",
    label: "توصيات الإدارة",
    Icon: ClipboardList,
  },
  { href: "/reports/calls", label: "عملاء جدد / المواعيد", Icon: PhoneCall },
  { href: "/reports/warming", label: "أدوات Warming", Icon: Flame },
  { href: "/reports/transferred", label: "عملاء منقولة", Icon: ArrowRightLeft },
  {
    href: "/settings/field-labels",
    label: "تصنيفات العملاء",
    Icon: Tags,
    managerPlus: true,
  },
  {
    href: "/settings/backup",
    label: "نسخ احتياطي للقاعدة",
    Icon: Database,
    adminOnly: true,
  },
  {
    href: "/admin/custom-fields",
    label: "الحقول المخصصة",
    Icon: SlidersHorizontal,
    adminOnly: true,
  },
  {
    href: "/admin/core-labels",
    label: "تسميات الحقول",
    Icon: Type,
    adminOnly: true,
  },
];

function filterLinks<
  T extends { adminOnly?: boolean; managerPlus?: boolean },
>(role: UserRole, items: T[]): T[] {
  const isAdmin = role === "ADMIN";
  const managerPlus = role === "ADMIN" || role === "MANAGER";
  return items.filter(
    (l) => (!l.adminOnly || isAdmin) && (!l.managerPlus || managerPlus)
  );
}

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") {
    return pathname === "/" || pathname === "/dashboard";
  }
  if (href === "/clients/new") return false;
  if (href === "/clients") {
    if (pathname === "/clients") return true;
    return (
      pathname.startsWith("/clients/") && !pathname.startsWith("/clients/new")
    );
  }
  return pathname.startsWith(`${href}/`);
}

function shortcutIsActive(pathname: string, href: string): boolean {
  if (href === "/clients/new") return pathname.startsWith("/clients/new");
  return isActive(pathname, href);
}

function shortcutLinkClass(pathname: string, href: string) {
  const active = shortcutIsActive(pathname, href);
  return cn(
    "group relative flex shrink-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-start transition-all duration-200 sm:px-3 sm:py-2.5",
    active
      ? "border-primary/25 bg-primary/[0.06] text-foreground shadow-sm ring-1 ring-primary/15 dark:bg-primary/10 dark:ring-primary/25"
      : "border-transparent bg-background/60 text-muted-foreground hover:border-border/80 hover:bg-background hover:text-foreground hover:shadow-sm dark:bg-background/40"
  );
}

function navLinkClass(pathname: string, href: string, compact?: boolean) {
  const active = isActive(pathname, href);
  return cn(
    compact
      ? "w-full rounded-lg px-3 py-2.5 text-[13px] leading-snug"
      : "inline-flex w-auto rounded-lg px-3 py-2 text-sm font-medium",
    "text-start transition-colors duration-150",
    active
      ? "bg-primary/10 text-foreground ring-1 ring-primary/20 dark:bg-primary/15"
      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
  );
}

const dropdownMotion = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { type: "spring" as const, stiffness: 520, damping: 34 },
};

function NavMenuButton({
  label,
  open,
  active,
  onClick,
}: {
  label: string;
  open: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        active || open
          ? "bg-primary/10 text-foreground ring-1 ring-primary/20 shadow-sm dark:bg-primary/15"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      <span>{label}</span>
      <ChevronDown
        className={cn(
          "size-3.5 shrink-0 text-muted-foreground/80 transition-transform duration-200",
          open && "rotate-180"
        )}
      />
    </button>
  );
}

export function CrmNav({
  role,
  userName,
}: {
  role: UserRole;
  userName: string;
}) {
  const pathname = usePathname();
  const p = filterLinks(role, primaryLinks);
  const r = filterLinks(role, reportLinks);
  const t = filterLinks(role, tailLinks);
  const shortcuts = filterLinks(role, navShortcuts);

  const [reportsOpen, setReportsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const reportsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const reportsMenuActive = r.some((l) => isActive(pathname, l.href));
  const settingsMenuActive = t.some((l) => isActive(pathname, l.href));

  useEffect(() => {
    setReportsOpen(false);
    setSettingsOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handlePointer(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (reportsRef.current && !reportsRef.current.contains(target)) {
        setReportsOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setSettingsOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setReportsOpen(false);
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/70">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <nav
            className="flex min-h-10 min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-2.5"
            aria-label="التطبيق"
          >
            <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border/60 bg-muted/25 p-1 shadow-sm dark:bg-muted/15">
              {p.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={navLinkClass(pathname, l.href)}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {r.length > 0 ? (
              <div ref={reportsRef} className="relative">
                <NavMenuButton
                  label="التقارير"
                  open={reportsOpen}
                  active={reportsMenuActive}
                  onClick={() => {
                    setReportsOpen((v) => !v);
                    setSettingsOpen(false);
                  }}
                />
                <AnimatePresence>
                  {reportsOpen ? (
                    <motion.div
                      key="reports-menu"
                      role="menu"
                      initial={dropdownMotion.initial}
                      animate={dropdownMotion.animate}
                      exit={dropdownMotion.exit}
                      transition={dropdownMotion.transition}
                      className="absolute start-0 top-[calc(100%+10px)] z-50 max-h-[min(70vh,440px)] w-[min(calc(100vw-2rem),20rem)] origin-top overflow-y-auto overscroll-contain rounded-2xl border border-border/80 bg-popover/95 p-2 shadow-xl shadow-black/5 ring-1 ring-border/30 backdrop-blur-xl dark:bg-popover dark:shadow-black/40"
                    >
                      <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
                        التقارير والقوائم
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {r.map((l) => (
                          <Link
                            key={l.href}
                            href={l.href}
                            role="menuitem"
                            className={navLinkClass(pathname, l.href, true)}
                            onClick={() => setReportsOpen(false)}
                          >
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}

            {t.length > 0 ? (
              <div ref={settingsRef} className="relative">
                <NavMenuButton
                  label="إعدادات"
                  open={settingsOpen}
                  active={settingsMenuActive}
                  onClick={() => {
                    setSettingsOpen((v) => !v);
                    setReportsOpen(false);
                  }}
                />
                <AnimatePresence>
                  {settingsOpen ? (
                    <motion.div
                      key="settings-menu"
                      role="menu"
                      initial={dropdownMotion.initial}
                      animate={dropdownMotion.animate}
                      exit={dropdownMotion.exit}
                      transition={dropdownMotion.transition}
                      className="absolute start-0 top-[calc(100%+10px)] z-50 max-h-[min(70vh,360px)] w-[min(calc(100vw-2rem),18rem)] origin-top overflow-y-auto overscroll-contain rounded-2xl border border-border/80 bg-popover/95 p-2 shadow-xl shadow-black/5 ring-1 ring-border/30 backdrop-blur-xl dark:bg-popover dark:shadow-black/40"
                    >
                      <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
                        الإعدادات والإدارة
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {t.map((l) => (
                          <Link
                            key={l.href}
                            href={l.href}
                            role="menuitem"
                            className={navLinkClass(pathname, l.href, true)}
                            onClick={() => setSettingsOpen(false)}
                          >
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}
          </nav>

          <div className="flex shrink-0 items-center gap-2 border-border/70 ps-2 sm:gap-3 sm:border-s sm:ps-4">
            <div
              className="flex max-w-[min(17rem,calc(100vw-9rem))] items-center gap-2.5 rounded-2xl border border-border/70 bg-card/80 py-1.5 pe-3 ps-2 shadow-sm backdrop-blur-md dark:bg-card/60"
              dir="rtl"
              aria-label={`مرحباً ${userName}`}
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20"
                aria-hidden
              >
                <UserRound className="size-[1.125rem]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 text-start leading-none">
                <span className="mb-0.5 block text-[0.6875rem] font-medium leading-none text-muted-foreground">
                  مرحباً
                </span>
                <span className="block truncate text-[0.9375rem] font-semibold leading-snug tracking-tight text-foreground">
                  {userName}
                </span>
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>

        {shortcuts.length > 0 ? (
          <div className="border-t border-border/60 bg-gradient-to-b from-muted/15 to-transparent py-3 dark:from-muted/10">
            <nav
              className="flex items-stretch gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2.5 [&::-webkit-scrollbar]:hidden"
              aria-label="اختصارات سريعة"
            >
              <div className="flex shrink-0 items-center gap-2 pe-1 text-muted-foreground sm:pe-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Zap className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                </span>
                <span className="hidden text-xs font-semibold tracking-tight text-foreground/90 sm:inline sm:max-w-[5.5rem] sm:leading-snug">
                  وصول سريع
                </span>
              </div>
              <div
                role="list"
                className="flex min-w-0 flex-1 items-stretch gap-1.5 sm:gap-2"
              >
                {shortcuts.map(({ href, label, Icon }) => {
                  const shortcutActive = shortcutIsActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      role="listitem"
                      title={label}
                      aria-current={shortcutActive ? "page" : undefined}
                      className={shortcutLinkClass(pathname, href)}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 sm:size-10",
                          shortcutActive
                            ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                            : "bg-muted/60 text-muted-foreground ring-1 ring-border/50 group-hover:bg-background group-hover:text-foreground dark:bg-muted/40"
                        )}
                      >
                        <Icon
                          className="size-[1.125rem] sm:size-5"
                          strokeWidth={2}
                          aria-hidden
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 max-w-[7.5rem] text-[11px] font-semibold leading-tight text-foreground sm:max-w-[9rem] sm:text-xs">
                          {label}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
