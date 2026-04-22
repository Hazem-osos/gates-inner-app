"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, UserRound } from "lucide-react";
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
  {
    href: "/settings/users",
    label: "المستخدمون وكلمة المرور",
    adminOnly: true,
  },
  { href: "/admin/custom-fields", label: "الحقول المخصصة", adminOnly: true },
  { href: "/admin/core-labels", label: "تسميات الحقول", adminOnly: true },
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

function roleLabelAr(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "أدمن";
    case "MANAGER":
      return "مدير";
    case "SALES":
      return "سيلز";
    default:
      return role;
  }
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

/** الصف العلوي فقط (بدون شريط الأيقونات) — يُدمج داخل `HeaderSystem`. */
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
    <div className="border-b border-border/60">
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
            className="flex max-w-[min(19rem,calc(100vw-9rem))] items-center gap-2.5 rounded-2xl border border-border/70 bg-card/80 py-1.5 pe-3 ps-2 shadow-sm backdrop-blur-md dark:bg-card/60"
            dir="rtl"
            aria-label={`مرحباً ${userName}، ${roleLabelAr(role)}`}
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
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate text-[0.9375rem] font-semibold leading-snug tracking-tight text-foreground">
                  {userName}
                </span>
                <span
                  className="shrink-0 rounded-md bg-muted/90 px-1.5 py-0.5 text-[0.625rem] font-medium leading-none text-muted-foreground ring-1 ring-border/60"
                  title="الوظيفة في النظام"
                >
                  {roleLabelAr(role)}
                </span>
              </span>
            </span>
          </div>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
