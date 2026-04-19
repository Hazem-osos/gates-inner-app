import type { Prisma, UserRole } from "@prisma/client";

/**
 * فلتر العملاء حسب الدور:
 * - SALES: فقط العملاء المسندين إليه (`assignedUserId === session`). العملاء بدون مسند لا يظهرون للسيلز.
 * - MANAGER / ADMIN: الكل أو حسب فلتر السيلز؛ يمكنهم رؤية عميل بلا مسند عندما لا يُطبَّق فلتر سيلز محدد.
 */
export function clientScopeWhere(args: {
  role: UserRole;
  userId: string;
  /** للمدير/الأدمن: معرف المندوب أو "all" أو فارغ = الكل */
  salesUserId?: string | null;
}): Prisma.ClientWhereInput {
  if (args.role === "SALES") {
    return { assignedUserId: args.userId };
  }
  const sid = args.salesUserId?.trim();
  if (sid && sid !== "all") {
    return { assignedUserId: sid };
  }
  return {};
}

/** التحقق من أن الجلسة تستطيع الوصول لعميل (سيلز = نفس التعيين فقط) */
export function canAccessClient(
  role: UserRole,
  sessionUserId: string,
  clientAssignedUserId: string | null
): boolean {
  if (role !== "SALES") return true;
  return clientAssignedUserId === sessionUserId;
}
