import type { ClientStatus, UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { differenceInCalendarDays } from "date-fns";

import { prisma } from "@/lib/prisma";

export type ReportSearchParams = {
  status?: string;
  q?: string;
};

export type ReportRow = {
  id: string;
  name: string;
  company: string | null;
  phone: string;
  status: ClientStatus;
  initialCallDate: Date | null;
  nextFollowUpAt: Date | null;
  customFields: Prisma.JsonValue;
  daysElapsed: number | null;
};

export async function getReportData(
  role: UserRole,
  userId: string,
  sp: ReportSearchParams
): Promise<{ rows: ReportRow[]; dynamicKeys: string[] }> {
  const where: Prisma.ClientWhereInput = {};
  if (role === "SALES") {
    where.assignedUserId = userId;
  }
  if (sp.status && sp.status !== "ALL") {
    where.status = sp.status as ClientStatus;
  }
  if (sp.q?.trim()) {
    const q = sp.q.trim();
    where.OR = [
      { name: { contains: q } },
      { company: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  const clients = await prisma.client.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 500,
    select: {
      id: true,
      name: true,
      company: true,
      phone: true,
      status: true,
      initialCallDate: true,
      nextFollowUpAt: true,
      customFields: true,
    },
  });

  const today = new Date();
  const keySet = new Set<string>();
  const rows: ReportRow[] = clients.map((c) => {
    const cf =
      typeof c.customFields === "object" &&
      c.customFields !== null &&
      !Array.isArray(c.customFields)
        ? (c.customFields as Record<string, unknown>)
        : {};
    for (const k of Object.keys(cf)) keySet.add(k);

    return {
      ...c,
      daysElapsed: c.initialCallDate
        ? differenceInCalendarDays(today, c.initialCallDate)
        : null,
    };
  });

  return { rows, dynamicKeys: [...keySet].sort() };
}
