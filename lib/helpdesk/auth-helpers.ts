import type { SupportRole } from "@prisma/client";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AuthPortal = "crm" | "support" | "customer";

export type SupportSessionUser = {
  portal: "support";
  id: string;
  email: string;
  name: string;
  supportRole: SupportRole;
};

export type CustomerSessionUser = {
  portal: "customer";
  id: string;
  email: string;
  name: string;
  companyName: string;
};

function sessionPortal(s: Session | null): AuthPortal | null {
  const p = s?.user?.portal;
  if (p === "crm" || p === "support" || p === "customer") return p;
  if (s?.user?.id) return "crm";
  return null;
}

export const getSupportSessionUser = cache(
  async (): Promise<SupportSessionUser | null> => {
    const s = await auth();
    if (!s?.user?.id || sessionPortal(s) !== "support") return null;
    const supportRole = s.user.supportRole;
    if (!supportRole) return null;
    return {
      portal: "support",
      id: s.user.id,
      email: s.user.email ?? "",
      name: s.user.name ?? "",
      supportRole,
    };
  }
);

export const requireSupportSessionUser = cache(
  async (): Promise<SupportSessionUser> => {
    const u = await getSupportSessionUser();
    if (!u) redirect("/support/login");
    const row = await prisma.supportUser.findUnique({
      where: { id: u.id },
      select: { isActive: true },
    });
    if (!row?.isActive) redirect("/support/login");
    return u;
  }
);

export async function requireSupportAdmin(): Promise<SupportSessionUser> {
  const u = await requireSupportSessionUser();
  if (u.supportRole !== "ADMIN") redirect("/support/dashboard");
  return u;
}

export const getCustomerSessionUser = cache(
  async (): Promise<CustomerSessionUser | null> => {
    const s = await auth();
    if (!s?.user?.id || sessionPortal(s) !== "customer") return null;
    const companyName = s.user.companyName ?? "";
    return {
      portal: "customer",
      id: s.user.id,
      email: s.user.email ?? "",
      name: s.user.name ?? "",
      companyName,
    };
  }
);

export const requireCustomerSessionUser = cache(
  async (): Promise<CustomerSessionUser> => {
    const u = await getCustomerSessionUser();
    if (!u) redirect("/customer/login");
    const row = await prisma.customer.findUnique({
      where: { id: u.id },
      select: { isActive: true, companyName: true },
    });
    if (!row?.isActive) redirect("/customer/login");
    return { ...u, companyName: row.companyName };
  }
);

export async function getCustomerForSession() {
  const u = await requireCustomerSessionUser();
  return prisma.customer.findUniqueOrThrow({ where: { id: u.id } });
}
