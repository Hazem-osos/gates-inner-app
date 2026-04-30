import type { NewLeadReachStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { userDisplayName } from "@/lib/user-display-name";

export type NewLeadReportRow = {
  id: string;
  entryYmd: string;
  phone: string;
  adText: string;
  salesName: string;
  reachStatus: NewLeadReachStatus;
  leadCategory: string | null;
  clientId: string | null;
};

export type NewLeadReportStats = {
  catB: number;
  catC: number;
  notReached: number;
  reached: number;
  catZ: number;
  catExpired: number;
};

export type NewLeadReportFilters = {
  fromYmd: string;
  toYmd: string;
  salesUserId: string;
  adQ: string;
  phoneQ: string;
  reach: string;
  category: string;
};

function normalizeCat(v: string | null | undefined): string | null {
  if (v == null || v === "") return null;
  return v.trim().toUpperCase();
}

export async function listNewLeadsForReport(
  filters: NewLeadReportFilters
): Promise<{ rows: NewLeadReportRow[]; stats: NewLeadReportStats }> {
  const { fromYmd, toYmd, salesUserId, adQ, phoneQ, reach, category } = filters;

  const andParts: Prisma.NewLeadWhereInput[] = [
    { entryYmd: { gte: fromYmd, lte: toYmd } },
  ];

  if (salesUserId && salesUserId !== "all") {
    andParts.push({ createdById: salesUserId });
  }
  if (adQ.trim()) {
    andParts.push({ adText: { contains: adQ.trim() } });
  }
  if (phoneQ.trim()) {
    andParts.push({ phone: { contains: phoneQ.trim() } });
  }
  if (reach === "NOT_REACHED") {
    andParts.push({ reachStatus: "NOT_REACHED" });
  } else if (reach === "REACHED") {
    andParts.push({ reachStatus: "REACHED" });
  }
  if (category === "__empty__") {
    andParts.push({
      OR: [{ leadCategory: null }, { leadCategory: "" }],
    });
  } else if (category && category !== "all") {
    andParts.push({ leadCategory: category.toUpperCase() });
  }

  const where: Prisma.NewLeadWhereInput =
    andParts.length === 1 ? andParts[0]! : { AND: andParts };

  const rawRows = await prisma.newLead.findMany({
    where,
    orderBy: [{ entryYmd: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    include: {
      createdBy: { select: { name: true, deletedAt: true } },
    },
  });

  const rows: NewLeadReportRow[] = rawRows.map((r) => ({
    id: r.id,
    entryYmd: r.entryYmd,
    phone: r.phone,
    adText: r.adText,
    salesName: userDisplayName(r.createdBy),
    reachStatus: r.reachStatus,
    leadCategory: normalizeCat(r.leadCategory),
    clientId: r.clientId,
  }));

  const stats: NewLeadReportStats = {
    catB: rows.filter((r) => r.leadCategory === "B").length,
    catC: rows.filter((r) => r.leadCategory === "C").length,
    notReached: rows.filter((r) => r.reachStatus === "NOT_REACHED").length,
    reached: rows.filter((r) => r.reachStatus === "REACHED").length,
    catZ: rows.filter((r) => r.leadCategory === "Z").length,
    catExpired: rows.filter((r) => r.leadCategory === "EXPIRED").length,
  };

  return { rows, stats };
}

export async function listUsersForNewLeadReportFilter(): Promise<
  { id: string; name: string }[]
> {
  return prisma.user.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }],
  });
}
