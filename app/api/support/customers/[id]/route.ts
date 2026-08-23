import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { apiSupportUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  companyName: z.string().trim().min(2).optional(),
  contactName: z.string().trim().min(2).optional(),
  isActive: z.boolean().optional(),
  licenseStartDate: z.string().optional(),
  licenseEndDate: z.string().optional(),
  assignedAgentId: z.string().nullable().optional(),
  hasUsedCourtesyTicket: z.boolean().optional(),
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
  const data: Record<string, unknown> = { ...parsed.data };
  delete data.password;
  if (parsed.data.licenseStartDate) {
    data.licenseStartDate = new Date(parsed.data.licenseStartDate);
  }
  if (parsed.data.licenseEndDate) {
    data.licenseEndDate = new Date(parsed.data.licenseEndDate);
  }
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }
  const customer = await prisma.customer.update({
    where: { id },
    data: data as never,
  });
  return NextResponse.json({ customer });
}
