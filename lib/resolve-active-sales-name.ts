import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

/**
 * اسم المندوب لعرضه في نص الفلتر عند اختيار سيلز محدد (لغير مندوب المبيعات —
 * المندوب لا يستخدم فلتر «مسند إليه» بنفس معنى التقارير الأخرى).
 */
export async function resolveActiveSalesName(
  role: UserRole,
  salesKey: string
): Promise<string | null> {
  if (role === "SALES" || !salesKey || salesKey === "all") {
    return null;
  }
  const row = await prisma.user.findUnique({
    where: { id: salesKey },
    select: { name: true },
  });
  return row?.name ?? null;
}

/**
 * اسم المستخدم لعرضه عند اختيار فلتر «من سجّل» (مثلاً تقرير Leads جديدة) — لجميع الأدوار.
 */
export async function resolveSalesFilterDisplayName(
  salesKey: string
): Promise<string | null> {
  if (!salesKey || salesKey === "all") {
    return null;
  }
  const row = await prisma.user.findUnique({
    where: { id: salesKey },
    select: { name: true },
  });
  return row?.name ?? null;
}
