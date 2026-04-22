import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  ClipboardList,
  Database,
  Flame,
  KeyRound,
  LayoutDashboard,
  PhoneCall,
  SlidersHorizontal,
  Tags,
  Trophy,
  Type,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";

import type { UserRole } from "@prisma/client";

export type CrmRibbonShortcut = {
  href: string;
  label: string;
  /** أيقونة Lucide — تُتجاهل إن وُجد `ribbonMark` */
  Icon?: LucideIcon;
  /** بدل الأيقونة: نص قصير داخل المربع (مثل B، NB) */
  ribbonMark?: string;
  adminOnly?: boolean;
  managerPlus?: boolean;
};

/** أيقونات الشريط السريع — يُصفى حسب الدور */
export const CRM_RIBBON_SHORTCUTS: CrmRibbonShortcut[] = [
  { href: "/dashboard", label: "لوحة إرشادية", Icon: LayoutDashboard },
  { href: "/clients", label: "العملاء", Icon: Users },
  { href: "/clients/new", label: "إضافة عميل", Icon: UserPlus },
  { href: "/reports/b", label: "تقرير عملاء B", ribbonMark: "B" },
  { href: "/reports/not-b", label: "تقرير Not B", ribbonMark: "NB" },
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
    href: "/settings/users",
    label: "المستخدمون وكلمة المرور",
    Icon: KeyRound,
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

export function filterCrmNavByRole<
  T extends { adminOnly?: boolean; managerPlus?: boolean },
>(role: UserRole, items: T[]): T[] {
  const isAdmin = role === "ADMIN";
  const managerPlus = role === "ADMIN" || role === "MANAGER";
  return items.filter(
    (l) => (!l.adminOnly || isAdmin) && (!l.managerPlus || managerPlus)
  );
}

export function crmPathIsActive(pathname: string, href: string): boolean {
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

export function crmRibbonShortcutIsActive(
  pathname: string,
  href: string
): boolean {
  if (href === "/clients/new") return pathname.startsWith("/clients/new");
  return crmPathIsActive(pathname, href);
}
