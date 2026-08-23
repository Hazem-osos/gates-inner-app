import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { apiSupportUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  companyName: z.string().trim().min(2),
  contactName: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  licenseStartDate: z.string(),
  licenseEndDate: z.string(),
  assignedAgentId: z.string().nullable().optional(),
});

export async function GET() {
  const su = await apiSupportUser();
  if (!su || su.supportRole !== "ADMIN") {
    return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
  }
  const customers = await prisma.customer.findMany({
    orderBy: { companyName: "asc" },
    include: {
      assignedAgent: { select: { id: true, name: true } },
      _count: { select: { tickets: true } },
    },
  });
  return NextResponse.json({ customers });
}

export async function POST(req: Request) {
  const su = await apiSupportUser();
  if (!su || su.supportRole !== "ADMIN") {
    return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ message: "طلب غير صالح." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: "بيانات غير صالحة." }, { status: 400 });
  }
  const hash = await bcrypt.hash(parsed.data.password, 10);
  const customer = await prisma.customer.create({
    data: {
      companyName: parsed.data.companyName,
      contactName: parsed.data.contactName,
      email: parsed.data.email.toLowerCase(),
      passwordHash: hash,
      licenseStartDate: new Date(parsed.data.licenseStartDate),
      licenseEndDate: new Date(parsed.data.licenseEndDate),
      assignedAgentId: parsed.data.assignedAgentId ?? null,
    },
  });
  return NextResponse.json({ customer }, { status: 201 });
}
