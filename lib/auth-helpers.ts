import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  const portal = (s.user as { portal?: string }).portal ?? "crm";
  if (portal !== "crm") return null;
  return {
    id: s.user.id,
    email: s.user.email ?? "",
    name: s.user.name ?? "",
    role: (s.user as { role: UserRole }).role,
  };
}

/**
 * معرّف المستخدم الفعلي في DB (يُصلح FK بعد إعادة البذرة عندما يبقى JWT بمعرّف قديم).
 */
export const resolveSessionDbUserId = cache(
  async (session: SessionUser): Promise<string | null> => {
    const byId = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true },
    });
    if (byId) return byId.id;
    const email = session.email?.trim();
    if (!email) return null;
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return byEmail?.id ?? null;
  }
);

export const requireSessionUser = cache(async (): Promise<SessionUser> => {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  return u;
});

export function isAdmin(role: UserRole) {
  return role === "ADMIN";
}

export function isManagerOrAdmin(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER";
}
