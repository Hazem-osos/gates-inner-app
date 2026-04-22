/**
 * عكس حقلي الاسم واسم الشركة لكل العملاء — لإصلاح بيانات استُوردت قبل تصحيح خريطة Excel
 * (كان عمود «الشركة» يُخزَّن في `name` و«المسؤول» في `company`).
 *
 * معاينة فقط (افتراضي):
 *   npx tsx scripts/swap-client-name-company.ts
 *
 * تنفيذ فعلي (بعد مراجعة المعاينة + نسخ احتياطي):
 *   YES_SWAP=1 npx tsx scripts/swap-client-name-company.ts --apply
 *
 * تحذير: إن وُجدت صفوف مستوردة بطريقة صحيحة مسبقاً (مسؤول في الاسم وشركة في الشركة)
 * فعكس الجميع قد يفسدها — راجع أول 5–10 أسطر في المعاينة.
 */
import "dotenv/config";

import { prisma } from "../lib/prisma";

async function main() {
  const apply = process.argv.includes("--apply");

  const clients = await prisma.client.findMany({
    select: { id: true, name: true, company: true },
    orderBy: { updatedAt: "desc" },
  });

  console.log("عدد العملاء:", clients.length);
  if (!apply) {
    console.log("\nمعاينة أول 5 صفوف (قبل ← بعد الاسم / بعد الشركة):");
    for (const c of clients.slice(0, 5)) {
      const oldN = c.name.trim();
      const oldC = (c.company ?? "").trim();
      const newName = oldC || oldN || "عميل";
      const newCompany = oldN || null;
      console.log(
        `- ${c.id.slice(0, 8)}… | «${oldN}» / «${oldC || "—"}» → «${newName}» / «${newCompany ?? "—"}»`
      );
    }
    console.log(
      "\nلم يُنفَّذ أي تحديث. للتنفيذ: YES_SWAP=1 و --apply\nاحتفظ بنسخة احتياطية من القاعدة قبل التشغيل."
    );
    return;
  }

  if (process.env.YES_SWAP !== "1") {
    console.error(
      "للتنفيذ اضبط YES_SWAP=1 بعد قراءة التحذير في رأس الملف (حماية من التشغيل بالخطأ)."
    );
    process.exit(1);
  }

  let n = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const c of clients) {
        const oldN = c.name.trim();
        const oldC = (c.company ?? "").trim();
        const newName = oldC || oldN || "عميل";
        const newCompany = oldN || null;
        if (newName === oldN && (newCompany ?? "") === oldC) continue;
        await tx.client.update({
          where: { id: c.id },
          data: { name: newName, company: newCompany },
        });
        n++;
      }
    },
    { maxWait: 60_000, timeout: 600_000 }
  );

  console.log("تم تحديث", n, "عميلاً.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
