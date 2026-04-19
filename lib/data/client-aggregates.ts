import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function aggregateClientsForScope(where: Prisma.ClientWhereInput) {
  const [total, byStatus, byClassification] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.client.groupBy({
      by: ["classificationId"],
      where,
      _count: { _all: true },
    }),
  ]);
  return { total, byStatus, byClassification };
}
