import type { CustomFieldDefinition } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getActiveCustomFieldDefinitions(): Promise<
  CustomFieldDefinition[]
> {
  return prisma.customFieldDefinition.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { labelAr: "asc" }],
  });
}
