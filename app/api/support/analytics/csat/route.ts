import { NextResponse } from "next/server";

import { apiSupportUser } from "@/lib/helpdesk/session-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const su = await apiSupportUser();
  if (!su || su.supportRole !== "ADMIN") {
    return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
  }
  const feedback = await prisma.ticketFeedback.findMany({
    include: {
      ticket: {
        select: {
          ticketNumber: true,
          assignedAgentId: true,
          assignedAgent: { select: { name: true } },
        },
      },
      customer: { select: { companyName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const byAgent = new Map<
    string,
    { agentName: string; sum: number; count: number }
  >();
  for (const f of feedback) {
    const aid = f.ticket.assignedAgentId ?? "unknown";
    const name = f.ticket.assignedAgent?.name ?? "—";
    const cur = byAgent.get(aid) ?? { agentName: name, sum: 0, count: 0 };
    cur.sum += f.rating;
    cur.count += 1;
    byAgent.set(aid, cur);
  }
  const agentStats = [...byAgent.entries()].map(([agentId, v]) => ({
    agentId,
    agentName: v.agentName,
    avgRating: v.count ? Math.round((v.sum / v.count) * 10) / 10 : 0,
    count: v.count,
  }));
  const overall =
    feedback.length > 0
      ? feedback.reduce((a, f) => a + f.rating, 0) / feedback.length
      : 0;
  return NextResponse.json({
    overallAvg: Math.round(overall * 10) / 10,
    totalReviews: feedback.length,
    agentStats,
    recent: feedback.slice(0, 20),
  });
}
