import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CORE_DEFAULTS: { fieldKey: string; labelAr: string; sortOrder: number }[] =
  [
    { fieldKey: "name", labelAr: "اسم العميل", sortOrder: 10 },
    { fieldKey: "phone", labelAr: "رقم الهاتف", sortOrder: 20 },
    { fieldKey: "company", labelAr: "اسم الشركة", sortOrder: 30 },
    { fieldKey: "position", labelAr: "المسمى الوظيفي", sortOrder: 40 },
    { fieldKey: "address", labelAr: "العنوان", sortOrder: 50 },
    { fieldKey: "quotePrice", labelAr: "عرض السعر", sortOrder: 60 },
    { fieldKey: "allowedDiscount", labelAr: "الخصم المسموح", sortOrder: 70 },
    { fieldKey: "status", labelAr: "تصنيف العميل", sortOrder: 80 },
    {
      fieldKey: "sourceAdName",
      labelAr: "اسم الإعلان",
      sortOrder: 90,
    },
    {
      fieldKey: "initialCallDate",
      labelAr: "تاريخ أول اتصال",
      sortOrder: 100,
    },
    {
      fieldKey: "nextFollowUpAt",
      labelAr: "تاريخ المتابعة التالي",
      sortOrder: 110,
    },
    { fieldKey: "contractValue", labelAr: "قيمة التعاقد", sortOrder: 120 },
    { fieldKey: "saleDate", labelAr: "تاريخ البيع", sortOrder: 130 },
    { fieldKey: "lossReason", labelAr: "سبب الإغلاق", sortOrder: 140 },
    { fieldKey: "closedLostAt", labelAr: "تاريخ الإغلاق", sortOrder: 150 },
  ];

async function main() {
  for (const row of CORE_DEFAULTS) {
    await prisma.coreFieldLabel.upsert({
      where: { fieldKey: row.fieldKey },
      create: { ...row, visible: true },
      update: { labelAr: row.labelAr, sortOrder: row.sortOrder },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@crm.local";
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const hash = await bcrypt.hash(adminPass, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "مدير النظام",
      passwordHash: hash,
      role: UserRole.ADMIN,
    },
    update: {
      passwordHash: hash,
      role: UserRole.ADMIN,
    },
  });

  const salesEmail = process.env.SEED_SALES_EMAIL ?? "sales@crm.local";
  const salesPass = process.env.SEED_SALES_PASSWORD ?? "sales123";
  const salesHash = await bcrypt.hash(salesPass, 10);

  await prisma.user.upsert({
    where: { email: salesEmail },
    create: {
      email: salesEmail,
      name: "مندوب مبيعات",
      passwordHash: salesHash,
      role: UserRole.SALES,
    },
    update: {
      passwordHash: salesHash,
    },
  });

  const mgrEmail = process.env.SEED_MANAGER_EMAIL ?? "manager@crm.local";
  const mgrPass = process.env.SEED_MANAGER_PASSWORD ?? "manager123";
  const mgrHash = await bcrypt.hash(mgrPass, 10);

  await prisma.user.upsert({
    where: { email: mgrEmail },
    create: {
      email: mgrEmail,
      name: "مدير مبيعات",
      passwordHash: mgrHash,
      role: UserRole.MANAGER,
    },
    update: {
      passwordHash: mgrHash,
      role: UserRole.MANAGER,
    },
  });

  console.log("Seed OK. Admin:", adminEmail, "/ Pass:", adminPass);
  console.log("Sales:", salesEmail, "/ Pass:", salesPass);
  console.log("Manager:", mgrEmail, "/ Pass:", mgrPass);

  const classifications: {
    slug: string;
    label: string;
    color: string;
    sortOrder: number;
    isBRow: boolean;
  }[] = [
    { slug: "b", label: "B", color: "#2563eb", sortOrder: 10, isBRow: true },
    { slug: "u", label: "U", color: "#ca8a04", sortOrder: 20, isBRow: false },
    { slug: "c", label: "C", color: "#9333ea", sortOrder: 30, isBRow: false },
    { slug: "z", label: "Z", color: "#db2777", sortOrder: 40, isBRow: false },
    { slug: "dist", label: "موزع", color: "#059669", sortOrder: 50, isBRow: false },
  ];

  for (const c of classifications) {
    await prisma.clientClassification.upsert({
      where: { slug: c.slug },
      create: c,
      update: {
        label: c.label,
        color: c.color,
        sortOrder: c.sortOrder,
        isBRow: c.isBRow,
      },
    });
  }
  console.log("Classifications seeded.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
