/**
 * يزيل صفوف ReportRowStyle المكررة (نفس reportKey + clientId لأكثر من مستخدم سابقاً).
 * شغّلها **مرة واحدة** قبل `npx prisma db push` بعد تحديث المخطط إلى @@unique([reportKey, clientId]).
 *
 *   npx tsx scripts/dedupe-report-row-styles.ts
 */
import { prisma } from "../lib/prisma";

async function main() {
  const dups = await prisma.$queryRaw<
    { clientId: string; reportKey: string; keepId: string }[]
  >`
    SELECT clientId, reportKey, MIN(id) AS keepId
    FROM ReportRowStyle
    GROUP BY clientId, reportKey
    HAVING COUNT(*) > 1
  `;

  for (const row of dups) {
    const result = await prisma.reportRowStyle.deleteMany({
      where: {
        clientId: row.clientId,
        reportKey: row.reportKey,
        NOT: { id: row.keepId },
      },
    });
    console.log(
      `Deduped ${row.reportKey} / ${row.clientId}: removed ${result.count} row(s)`
    );
  }

  if (dups.length === 0) {
    console.log("No duplicate (reportKey, clientId) groups found.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
