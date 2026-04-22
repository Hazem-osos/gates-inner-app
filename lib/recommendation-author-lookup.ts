import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * لصفوف «نص فقط على Client» (لا تظهر في نتائج الاستعلام المُفلترة كتوصية):
 * نفحص جدول ManagementRecommendation عن نفس (clientId + body) — بدون فلترة تاريخ —
 * ونُرجع اسم `author` (من حفظ تقرير B / البطاقة). الأحدث أولاً.
 */
export async function authorNamesByClientAndBody(
  pairs: { clientId: string; body: string }[],
  baseWhere: Prisma.ManagementRecommendationWhereInput
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (pairs.length === 0) return out;

  const orClause = pairs.map((p) => ({
    clientId: p.clientId,
    body: p.body,
  }));

  const rows = await prisma.managementRecommendation.findMany({
    where: {
      AND: [baseWhere, { OR: orClause }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      clientId: true,
      body: true,
      author: { select: { name: true } },
    },
  });

  for (const r of rows) {
    const k = `${r.clientId}\0${r.body.trim()}`;
    if (!out.has(k)) out.set(k, r.author.name);
  }
  return out;
}
