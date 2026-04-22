/**
 * اختبار: محاولة تسجيل مستخدم ببريد موجود مسبقاً يجب أن تفشل دون إضافة صف أو تغيير البيانات.
 *
 * تشغيل: npx tsx scripts/test-register-duplicate-email.ts
 *
 * يتطلب DATABASE_URL ويفضّل ALLOW_OPEN_REGISTRATION=true لاختبار المسار الكامل.
 */
import "dotenv/config";

import { registerUserAction } from "../app/actions/register-user";
import { prisma } from "../lib/prisma";

async function main() {
  const beforeCount = await prisma.user.count();
  if (beforeCount === 0) {
    console.error("لا يوجد مستخدمون في القاعدة — شغّل prisma db seed أولاً.");
    process.exit(1);
  }

  const existing = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, passwordHash: true },
  });
  if (!existing?.email) {
    console.error("لم يُعثر على بريد لاختبار التكرار.");
    process.exit(1);
  }

  const hashBefore = existing.passwordHash;

  console.log("اختبار التسجيل ببريد موجود:", existing.email);
  console.log("عدد المستخدمين قبل:", beforeCount);

  if (process.env.ALLOW_OPEN_REGISTRATION !== "true") {
    const r = await registerUserAction({
      email: existing.email,
      password: "anypassword1",
      name: "Should Not Apply",
      role: "SALES",
    });
    if (r.ok !== false) {
      console.error("فشل الاختبار: توقّعنا رفضاً لأن التسجيل المفتوح معطّل.");
      process.exit(1);
    }
    console.log("مسار معطّل (ALLOW_OPEN_REGISTRATION≠true):", r.message);
    const after = await prisma.user.count();
    if (after !== beforeCount) {
      console.error("فشل: تغيّر عدد المستخدمين رغم الرفض المبكر.");
      process.exit(1);
    }
    console.log("✓ لم يُضف أي مستخدم (عدد ثابت).");
    process.exit(0);
  }

  const result = await registerUserAction({
    email: existing.email.toUpperCase() + " ",
    password: "different9",
    name: "Duplicate Attempt Name",
    role: "SALES",
  });

  if (result.ok !== false) {
    console.error("فشل الاختبار: كان يجب رفض التسجيل لبريد مكرر.");
    process.exit(1);
  }

  if (!result.message.includes("مسجّل")) {
    console.warn("تحذير: الرسالة غير متوقعة:", result.message);
  }

  const afterCount = await prisma.user.count();
  if (afterCount !== beforeCount) {
    console.error(
      "فشل الاختبار: عدد المستخدمين تغيّر — كان",
      beforeCount,
      "صار",
      afterCount
    );
    process.exit(1);
  }

  const ghost = await prisma.user.findFirst({
    where: { name: "Duplicate Attempt Name" },
  });
  if (ghost) {
    console.error("فشل الاختبار: وُجد مستخدم بالاسم التجريبي رغم الرفض.");
    process.exit(1);
  }

  const same = await prisma.user.findUnique({
    where: { id: existing.id },
    select: { passwordHash: true, name: true, email: true },
  });
  if (same?.passwordHash !== hashBefore) {
    console.error("فشل الاختبار: تغيّر hash كلمة مرور المستخدم الأصلي.");
    process.exit(1);
  }
  if (same?.name !== existing.name || same?.email !== existing.email) {
    console.error("فشل الاختبار: تغيّر اسم أو بريد المستخدم الأصلي.");
    process.exit(1);
  }

  console.log("الرد:", result.message);
  console.log("✓ لم يُضف مستخدم جديد");
  console.log("✓ لم يُعدل المستخدم الموجود (البريد / الاسم / كلمة المرور)");
  console.log("الاختبار نجح.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
