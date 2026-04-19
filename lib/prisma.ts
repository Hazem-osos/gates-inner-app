import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prismaLog =
  process.env.PRISMA_LOG_QUERIES === "1"
    ? (["query", "error", "warn"] as const)
    : (["error"] as const);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    /** في التطوير: بدون `query` يكون التطبيق أسرع بكثير؛ فعّل PRISMA_LOG_QUERIES=1 عند التتبع. */
    log: [...prismaLog],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
