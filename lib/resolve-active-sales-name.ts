import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

/** اسم المندوب لعرضه في نص الفلتر عند اختيار سيلز محدد (لغير مندوب المبيعات). */
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
