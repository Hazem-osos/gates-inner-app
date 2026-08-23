import { NextResponse } from "next/server";

import { apiSupportUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const su = await apiSupportUser();
  if (!su || su.supportRole !== "ADMIN") {
    return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
  }
  const audits = await prisma.ticketResolutionAudit.findMany({
    orderBy: { closedAt: "desc" },
    take: 200,
    include: {
      ticket: {
        select: {
          ticketNumber: true,
          subject: true,
          description: true,
          customer: { select: { companyName: true } },
        },
      },
      agent: { select: { name: true } },
    },
  });
  return NextResponse.json({ audits });
}
