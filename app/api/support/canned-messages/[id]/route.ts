import { NextResponse } from "next/server";
import { z } from "zod";

import { apiSupportUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  content: z.string().trim().min(5).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
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
  const message = await prisma.cannedMessage.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ message });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const su = await apiSupportUser();
  if (!su || su.supportRole !== "ADMIN") {
    return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
  }
  const { id } = await ctx.params;
  await prisma.cannedMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
