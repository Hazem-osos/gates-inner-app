"use client";

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
];

const tailLinks: NavLink[] = [
  { href: "/clients/transferred", label: "عملاء منقولة" },
  {
    href: "/settings/field-labels",
    label: "تصنيفات العملاء",
    managerPlus: true,
  },
  { href: "/admin/custom-fields", label: "الحقول المخصصة", adminOnly: true },
  { href: "/admin/core-labels", label: "تسميات الحقول", adminOnly: true },
];

function filterLinks(role: UserRole, items: NavLink[]) {
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

function navLinkClass(pathname: string, href: string, compact?: boolean) {
  const active = isActive(pathname, href);
  return cn(
    compact ? "w-full px-2.5 py-2 text-[13px] leading-tight" : "inline-flex w-auto px-2.5 py-1.5 text-sm",
    "flex items-center rounded-lg text-start transition-colors duration-150",
    active
      ? "bg-slate-100 font-medium text-slate-900 ring-1 ring-slate-200/80"
      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
  );
}

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
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-150",
        active || open
          ? "bg-slate-100 font-medium text-slate-900 ring-1 ring-slate-200/80"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      )}
    >
      <span>{label}</span>
      <ChevronDown
        className={cn(
          "size-3.5 shrink-0 text-zinc-400 transition-transform duration-200",
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
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-md supports-backdrop-filter:bg-white/75">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5">
        <nav
          className="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-2"
          aria-label="التطبيق"
        >
          {/* أساسي */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-1">
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
              {reportsOpen ? (
                <div
                  role="menu"
                  className="absolute inset-s-0 top-[calc(100%+6px)] z-50 max-h-[min(70vh,420px)] w-[min(calc(100vw-2rem),20rem)] overflow-y-auto rounded-xl border border-zinc-200/90 bg-white p-1.5 shadow-lg ring-1 ring-zinc-950/5"
                >
                  <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    تقارير
                  </p>
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
              ) : null}
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
              {settingsOpen ? (
                <div
                  role="menu"
                  className="absolute inset-s-0 top-[calc(100%+6px)] z-50 max-h-[min(70vh,320px)] w-[min(calc(100vw-2rem),18rem)] overflow-y-auto rounded-xl border border-zinc-200/90 bg-white p-1.5 shadow-lg ring-1 ring-zinc-950/5"
                >
                  <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    إعدادات وإدارة
                  </p>
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
              ) : null}
            </div>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5 border-s border-zinc-200/90 ps-3 sm:gap-3">
          <div
            className="flex max-w-[min(16rem,calc(100vw-10rem))] items-center gap-2.5 rounded-2xl border border-zinc-200/70 bg-white/65 py-1.5 pe-3.5 ps-2 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-16px_rgba(15,23,42,0.12)] backdrop-blur-md supports-backdrop-filter:bg-white/55 dark:border-zinc-700/80 dark:bg-zinc-950/50 dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)] dark:supports-backdrop-filter:bg-zinc-950/40"
            dir="rtl"
            aria-label={`مرحباً ${userName}`}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-zinc-50 shadow-inner ring-1 ring-zinc-950/20 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-white/10"
              aria-hidden
            >
              <UserRound className="size-[1.125rem]" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 text-start leading-none">
              <span className="mb-0.5 block text-[0.6875rem] font-medium leading-none text-zinc-500 dark:text-zinc-400">
                مرحباً
              </span>
              <span className="block truncate text-[0.9375rem] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">
                {userName}
              </span>
            </span>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
