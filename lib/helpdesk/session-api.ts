import { auth } from "@/auth";
import type { SupportRole } from "@prisma/client";

export async function apiSupportUser() {
  const s = await auth();
  if (!s?.user?.id || s.user.portal !== "support") return null;
  return {
    id: s.user.id,
    supportRole: s.user.supportRole as SupportRole,
  };
}

export async function apiCustomerUser() {
  const s = await auth();
  if (!s?.user?.id || s.user.portal !== "customer") return null;
  return { id: s.user.id };
}
