import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { apiSupportUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().trim().min(2).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["ADMIN", "AGENT"]).optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const su = await apiSupportUser();
  if (!su || su.supportRole !== "ADMIN") {
    return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
  }
  const { id } = await ctx.params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ message: "طلب غير صالح." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: "بيانات غير صالحة." }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.role) data.role = parsed.data.role;
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }
  const agent = await prisma.supportUser.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  return NextResponse.json({ agent });
}
