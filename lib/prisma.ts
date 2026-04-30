import { PrismaClient } from "@prisma/client";

/** زد الرقم بعد أي ‎`prisma generate`‎ يغيّر شكل النماذج (حقول / delegates) حتى لا يبقى ‎global‎ على عميل قديم. */
const PRISMA_CLIENT_SCHEMA_VERSION = 3;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  __prismaClientSchemaVersion?: number;
};

const prismaLog =
  process.env.PRISMA_LOG_QUERIES === "1"
    ? (["query", "error", "warn"] as const)
    : (["error"] as const);

function createPrismaClient() {
  return new PrismaClient({
    /** في التطوير: بدون `query` يكون التطبيق أسرع بكثير؛ فعّل PRISMA_LOG_QUERIES=1 عند التتبع. */
    log: [...prismaLog],
  });
}

/**
 * في التطوير: بعد ‎`prisma generate`‎ قد يبقى ‎PrismaClient‎ قديماً في ‎global‎ (بدون حقول جديدة مثل ‎`leadCategory`‎)
 * أو بدون delegate ‎`newLead`‎ — نستبدله.
 */
if (process.env.NODE_ENV !== "production") {
  const existing = globalForPrisma.prisma;
  const versionOk =
    globalForPrisma.__prismaClientSchemaVersion === PRISMA_CLIENT_SCHEMA_VERSION;
  const hasNewLeadDelegate =
    typeof (existing as unknown as { newLead?: unknown })?.newLead !==
    "undefined";
  if (existing && (!versionOk || !hasNewLeadDelegate)) {
    void existing.$disconnect().catch(() => {});
    delete globalForPrisma.prisma;
  }
}

export const prisma =
  process.env.NODE_ENV !== "production"
    ? (globalForPrisma.prisma ??= createPrismaClient())
    : globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prismaClientSchemaVersion = PRISMA_CLIENT_SCHEMA_VERSION;
}
