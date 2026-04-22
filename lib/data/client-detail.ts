import { prisma } from "@/lib/prisma";

export async function getClientDetail(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      assignedUser: {
        select: { id: true, name: true, email: true, deletedAt: true },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { name: true, deletedAt: true } } },
      },
      warmingTools: { orderBy: { createdAt: "desc" } },
    },
  });
}
