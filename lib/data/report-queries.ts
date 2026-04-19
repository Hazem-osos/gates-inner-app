import { ClientStatus, Prisma } from "@prisma/client";

import { clientScopeWhere } from "@/lib/report-scope";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export type ReportSortKey =
  | "days"
  | "quotePrice"
  | "initialCallDate"
  | "nextFollowUpAt";

export type ReportSortDir = "asc" | "desc";

export async function listClientsForReport(args: {
  role: UserRole;
  userId: string;
  /** للمدير/الأدمن: «all» أو معرف السيلز */
  salesUserId?: string | null;
  status: ClientStatus | ClientStatus[];
  q?: string;
  sort?: ReportSortKey;
  sortDir?: ReportSortDir;
  take?: number;
}) {
  const take = args.take ?? 500;
  const statuses = Array.isArray(args.status) ? args.status : [args.status];

  const scope = clientScopeWhere({
    role: args.role,
    userId: args.userId,
    salesUserId: args.salesUserId,
  });

  const where: Prisma.ClientWhereInput = {
    ...scope,
    status: { in: statuses },
    ...(args.q?.trim()
      ? {
          OR: [
            { name: { contains: args.q.trim() } },
            { company: { contains: args.q.trim() } },
            { phone: { contains: args.q.trim() } },
            { phone2: { contains: args.q.trim() } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ClientOrderByWithRelationInput[] = [];
  const dir = args.sortDir ?? "desc";

  switch (args.sort) {
    case "quotePrice":
      orderBy.push({ quotePrice: dir });
      break;
    case "initialCallDate":
      orderBy.push({ initialCallDate: dir });
      break;
    case "nextFollowUpAt":
      orderBy.push({ nextFollowUpAt: dir });
      break;
    case "days":
      orderBy.push({ initialCallDate: dir === "asc" ? "desc" : "asc" });
      break;
    default:
      /** ترتيب ثابت — لا يعتمد على updatedAt حتى لا يقفز الصف لأعلى القائمة بعد كل حفظ */
      orderBy.push({ createdAt: "asc" });
      break;
  }

  orderBy.push({ id: "asc" });

  return prisma.client.findMany({
    where,
    include: {
      assignedUser: { select: { id: true, name: true } },
      classification: { select: { id: true, label: true, color: true, isBRow: true } },
    },
    orderBy,
    take,
  });
}
