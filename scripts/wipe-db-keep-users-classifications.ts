/**
 * يحذف كل بيانات CRM ما عدا:
 * - User (الحسابات)
 * - ClientClassification (التصنيفات)
 *
 * التشغيل: npx tsx scripts/wipe-db-keep-users-classifications.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const classCount = await prisma.clientClassification.count();

  await prisma.$transaction(
    async (tx) => {
      await tx.alert.deleteMany();
      await tx.managementRecommendation.deleteMany();
      await tx.interaction.deleteMany();
      await tx.warmingToolSent.deleteMany();
      await tx.clientStatusChange.deleteMany();
      await tx.reportRowStyle.deleteMany();
      await tx.clientTransfer.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.client.deleteMany();
      await tx.customFieldDefinition.deleteMany();
      await tx.coreFieldLabel.deleteMany();
    },
    { maxWait: 60_000, timeout: 300_000 }
  );

  console.log("Done. Kept:", {
    users: userCount,
    classifications: classCount,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
