"use server";

import { revalidatePath } from "next/cache";

import {
  getSessionUser,
  resolveSessionDbUserId,
} from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export type NewLeadActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function createNewLeadAction(input: {
  entryYmd: string;
  phone: string;
  adText: string;
}): Promise<NewLeadActionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "غير مصرح." };

  const dbUserId = await resolveSessionDbUserId(session);
  if (!dbUserId) {
    return {
      ok: false,
      message:
        "لم يُعثر على حسابك في النظام. سجّل الخروج ثم الدخول مرة أخرى.",
    };
  }

  const entryYmd = input.entryYmd.trim();
  if (!YMD.test(entryYmd)) {
    return { ok: false, message: "تاريخ اليوم غير صالح." };
  }

  const phone = input.phone.trim();
  if (phone.length < 5) {
    return { ok: false, message: "أدخل رقماً للجوال (5 أرقام على الأقل)." };
  }

  const adText = input.adText.trim();
  if (!adText) {
    return { ok: false, message: "حقل الإعلان مطلوب." };
  }
  if (adText.length > 500) {
    return { ok: false, message: "نص الإعلان طويل جداً." };
  }

  try {
    await prisma.newLead.create({
      data: {
        entryYmd,
        phone,
        adText,
        createdById: dbUserId,
      },
    });
    revalidatePath("/reports/new-leads");
    revalidatePath("/reports/new-leads-report");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "تعذر حفظ الليد." };
  }
}

export async function markNewLeadBadClientAction(
  leadId: string
): Promise<NewLeadActionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "غير مصرح." };
  const dbUserId = await resolveSessionDbUserId(session);
  if (!dbUserId) {
    return { ok: false, message: "لم يُعثر على حسابك في النظام." };
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ clientId: string | null }>>`
      SELECT clientId FROM NewLead WHERE id = ${leadId} LIMIT 1
    `;
    if (rows.length === 0) return { ok: false, message: "الليد غير موجود." };
    if (rows[0]!.clientId != null) {
      return {
        ok: false,
        message: "يوجد بطاقة عميل مرتبطة — لا يمكن تنفيذ «عميل سيء».",
      };
    }

    // ‎$executeRaw‎ لا يعتمد على DMMF فيذاكرة العميل (يتجاوز عميل ‎Prisma‎ قديم بعد ‎generate‎)
    const affected = await prisma.$executeRaw`
      UPDATE NewLead
      SET reachStatus = 'REACHED', leadCategory = 'Z', updatedAt = NOW()
      WHERE id = ${leadId} AND clientId IS NULL
    `;
    if (Number(affected) < 1) {
      return {
        ok: false,
        message: "تعذر التحديث — ربما ارتُبط الليد بعميل للتو.",
      };
    }
    revalidatePath("/reports/new-leads-report");
    revalidatePath("/reports/new-leads");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "تعذر التحديث." };
  }
}

export async function markNewLeadExpiredAction(
  leadId: string
): Promise<NewLeadActionResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "غير مصرح." };
  const dbUserId = await resolveSessionDbUserId(session);
  if (!dbUserId) {
    return { ok: false, message: "لم يُعثر على حسابك في النظام." };
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM NewLead WHERE id = ${leadId} LIMIT 1
    `;
    if (rows.length === 0) return { ok: false, message: "الليد غير موجود." };

    const affected = await prisma.$executeRaw`
      UPDATE NewLead
      SET leadCategory = 'EXPIRED', updatedAt = NOW()
      WHERE id = ${leadId}
    `;
    if (Number(affected) < 1) {
      return { ok: false, message: "تعذر التحديث." };
    }
    revalidatePath("/reports/new-leads-report");
    revalidatePath("/reports/new-leads");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "تعذر التحديث." };
  }
}
