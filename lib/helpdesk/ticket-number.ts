import { format } from "date-fns";

import { prisma } from "@/lib/prisma";

export async function generateTicketNumber(now = new Date()): Promise<string> {
  const day = format(now, "yyyyMMdd");
  const prefix = `HD-${day}-`;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const count = await prisma.ticket.count({
    where: { createdAt: { gte: start, lte: end } },
  });
  const seq = String(count + 1).padStart(5, "0");
  return `${prefix}${seq}`;
}
