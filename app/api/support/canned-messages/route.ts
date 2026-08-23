import { NextResponse } from "next/server";
import { z } from "zod";

import { apiSupportUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().trim().min(2).max(120),
  content: z.string().trim().min(5),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const su = await apiSupportUser();
  if (!su) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  const messages = await prisma.cannedMessage.findMany({
    where: su.supportRole === "ADMIN" ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  return NextResponse.json({ messages });
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
  const message = await prisma.cannedMessage.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  return NextResponse.json({ message }, { status: 201 });
}
