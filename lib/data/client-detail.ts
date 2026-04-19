import { prisma } from "@/lib/prisma";

export async function getClientDetail(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
      interactions: {
        orderBy: { interactionAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { name: true } } },
      },
      warmingTools: { orderBy: { createdAt: "desc" } },
      recommendations: {
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { name: true } },
          targetUser: { select: { name: true } },
        },
      },
    },
  });
}
