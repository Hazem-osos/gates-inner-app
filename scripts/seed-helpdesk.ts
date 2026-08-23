/**
 * بذرة بيانات تجريبية للدعم الفني
 * تشغيل: npx tsx scripts/seed-helpdesk.ts
 */
import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma";

async function main() {
  const pass = "Helpdesk123!";
  const hash = await bcrypt.hash(pass, 10);

  const admin = await prisma.supportUser.upsert({
    where: { email: "support-admin@demo.local" },
    create: {
      email: "support-admin@demo.local",
      name: "مدير الدعم",
      passwordHash: hash,
      role: "ADMIN",
    },
    update: {},
  });

  const agent = await prisma.supportUser.upsert({
    where: { email: "agent@demo.local" },
    create: {
      email: "agent@demo.local",
      name: "وكيل الدعم",
      passwordHash: hash,
      role: "AGENT",
    },
    update: {},
  });

  const start = new Date();
  const end = new Date();
  end.setFullYear(end.getFullYear() + 1);

  await prisma.customer.upsert({
    where: { email: "customer@demo.local" },
    create: {
      email: "customer@demo.local",
      companyName: "شركة تجريبية",
      contactName: "مسؤول الدعم",
      passwordHash: hash,
      licenseStartDate: start,
      licenseEndDate: end,
      assignedAgentId: agent.id,
    },
    update: { assignedAgentId: agent.id },
  });

  const cannedCount = await prisma.cannedMessage.count();
  if (cannedCount === 0) {
    await prisma.cannedMessage.createMany({
      data: [
        {
          title: "طلب لقطات شاشة",
          content: "يرجى إرسال لقطات شاشة أوضح للخطأ مع وقت حدوثه.",
          sortOrder: 1,
        },
        {
          title: "تصعيد للهندسة",
          content: "تم تصعيد مشكلتك لفريق الهندسة وسنوافيك بالتحديث.",
          sortOrder: 2,
        },
        {
          title: "تحديث مجدول",
          content: "تم جدولة تحديث لمعالجة هذه المشكلة في أقرب إصدار.",
          sortOrder: 3,
        },
      ],
    });
  }

  console.log("Helpdesk seed OK");
  console.log("  Admin:", admin.email, pass);
  console.log("  Agent:", agent.email, pass);
  console.log("  Customer: customer@demo.local", pass);
  console.log("  Gate dev fallback: dev-gate (if ADMIN_GATE_SECRET unset)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
