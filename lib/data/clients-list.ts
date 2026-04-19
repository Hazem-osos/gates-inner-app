import type { UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/report-scope";

export async function listClientsForUser(
  role: UserRole,
  userId: string,
  salesUserId?: string | null
) {
  const where: Prisma.ClientWhereInput = {
    ...clientScopeWhere({ role, userId, salesUserId }),
  };

  return prisma.client.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      company: true,
      phone: true,
      status: true,
      nextFollowUpAt: true,
      initialCallDate: true,
      assignedUser: { select: { name: true } },
    },
    take: 500,
  });
}
