import { prisma } from "@/lib/prisma";
import { userDisplayName } from "@/lib/user-display-name";

export type NewLeadListRow = {
  id: string;
  phone: string;
  adText: string;
  salesName: string;
};

export async function listNewLeadsForEntryDay(
  entryYmd: string
): Promise<NewLeadListRow[]> {
  const rows = await prisma.newLead.findMany({
    where: { entryYmd },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      createdBy: { select: { name: true, deletedAt: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    phone: r.phone,
    adText: r.adText,
    salesName: userDisplayName(r.createdBy),
  }));
}
