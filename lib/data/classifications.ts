import { sanitizeDisplayLabel } from "@/lib/display-text";
import { prisma } from "@/lib/prisma";

export type ClassificationRow = {
  id: string;
  slug: string;
  label: string;
  color: string;
  sortOrder: number;
  isBRow: boolean;
};

export async function listClientClassifications(): Promise<ClassificationRow[]> {
  const rows = await prisma.clientClassification.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    label: sanitizeDisplayLabel(r.label),
    color: r.color,
    sortOrder: r.sortOrder,
    isBRow: r.isBRow,
  }));
}
