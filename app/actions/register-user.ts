"use server";

import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type RegisterResult =
  | { ok: true }
  | { ok: false; message: string };

export async function registerUserAction(raw: {
  email: string;
  password: string;
  name: string;
  role: "SALES" | "MANAGER";
}): Promise<RegisterResult> {
  if (process.env.ALLOW_OPEN_REGISTRATION !== "true") {
    return {
      ok: false,
      message: "التسجيل المفتوح معطّل. ضبط ALLOW_OPEN_REGISTRATION=true في الخادم.",
    };
  }

  const email = raw.email.trim().toLowerCase();
  if (!email || !raw.password || raw.password.length < 6) {
    return { ok: false, message: "بريد أو كلمة مرور غير صالحة." };
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false, message: "البريد مسجّل مسبقاً." };

  const hash = await bcrypt.hash(raw.password, 10);
  const role =
    raw.role === "MANAGER" ? UserRole.MANAGER : UserRole.SALES;

  await prisma.user.create({
    data: {
      email,
      name: raw.name.trim() || email,
      passwordHash: hash,
      role,
    },
  });

  return { ok: true };
}
