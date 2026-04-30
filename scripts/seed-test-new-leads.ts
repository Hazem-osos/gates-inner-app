/**
 * إدراج 3 ليدات تجريبية (اختبار تقرير ليدات جديدة).
 * تشغيل: npx tsx scripts/seed-test-new-leads.ts
 */
import "dotenv/config";

import { todayInputDate } from "../lib/date-arabic";
import { prisma } from "../lib/prisma";

async function main() {
  let user = await prisma.user.findFirst({
    where: { deletedAt: null, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (!user) {
    user = await prisma.user.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
  }
  if (!user) {
    console.error("لا يوجد مستخدم في القاعدة — شغّل prisma db seed أولاً.");
    process.exit(1);
  }

  const entryYmd = todayInputDate();
  const rows = [
    { phone: "0501000001", adText: "اختبار إعلان أ — فيسبوك حملة ربيع" },
    { phone: "0501000002", adText: "اختبار إعلان ب — سناب دعوة عامة" },
    { phone: "0501000003", adText: "اختبار إعلان ج — قوقل بحث محلي" },
  ];

  for (const r of rows) {
    await prisma.newLead.create({
      data: {
        entryYmd,
        phone: r.phone,
        adText: r.adText,
        createdById: user.id,
      },
    });
  }

  console.log(
    `تم إنشاء 3 ليدات ليوم ${entryYmd} بواسطة المستخدم: ${user.name} (${user.id})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
