import type { CoreFieldLabel } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getCoreFieldLabels(): Promise<CoreFieldLabel[]> {
  return prisma.coreFieldLabel.findMany({
    where: { visible: true },
    orderBy: [{ sortOrder: "asc" }, { fieldKey: "asc" }],
  });
}

export async function getAllCoreFieldLabelsForAdmin(): Promise<
  CoreFieldLabel[]
> {
  return prisma.coreFieldLabel.findMany({
    orderBy: [{ sortOrder: "asc" }, { fieldKey: "asc" }],
  });
}

export function labelMap(labels: CoreFieldLabel[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const l of labels) {
    m[l.fieldKey] = l.labelAr;
  }
  return m;
}
