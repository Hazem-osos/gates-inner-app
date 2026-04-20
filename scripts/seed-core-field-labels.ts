/**
 * يعيد تعبئة جدول CoreFieldLabel (تسميات الحقول) دون لمس باقي البيانات.
 * التشغيل: npx tsx scripts/seed-core-field-labels.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import { upsertCoreFieldLabels } from "../lib/seed-data/core-field-label-defaults";

const prisma = new PrismaClient();

async function main() {
  await upsertCoreFieldLabels(prisma);
  const n = await prisma.coreFieldLabel.count();
  console.log("Core field labels OK. Rows:", n);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
