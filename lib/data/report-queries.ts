import { ClientStatus, Prisma } from "@prisma/client";

import { MAX_CLIENT_ROWS_FOR_UI } from "@/lib/constants/client-query-limits";
import { clientScopeWhere } from "@/lib/report-scope";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

/**
 * حقول مطلوبة لتصدير Excel/PDF فقط — يقلّل حجم الصف المقروء من MySQL
 * (يستثني customFields وحقولاً غير مستخدمة في التقرير).
 */
export const clientReportExportSelect = {
  id: true,
  name: true,
  phone: true,
  phone2: true,
  company: true,
  position: true,
  address: true,
  quotePrice: true,
  quoteDetail: true,
  status: true,
  adPlatform: true,
  sourceAdName: true,
  initialCallDate: true,
  nextFollowUpAt: true,
  notBClassification: true,
  classificationId: true,
  activity: true,
  managementRecommendationText: true,
  managementRecommendationDate: true,
  currentSituation: true,
  qqAnswer: true,
  callSummary: true,
  salesNotes: true,
  clientWarmingText: true,
  visitAppointmentScheduled: true,
  visitAppointmentDate: true,
  presentingEmployeeName: true,
  followUpSlots: true,
  finalStatusNote: true,
  closedLostAt: true,
  lossReason: true,
  saleDate: true,
  contractValue: true,
  assignedUser: { select: { id: true, name: true, deletedAt: true } },
  classification: {
    select: { id: true, label: true, color: true, isBRow: true },
  },
} satisfies Prisma.ClientSelect;

export type ClientReportExportRow = Prisma.ClientGetPayload<{
  select: typeof clientReportExportSelect;
}>;

export type ReportSortKey =
  | "days"
  | "quotePrice"
  | "initialCallDate"
  | "nextFollowUpAt";

export type ReportSortDir = "asc" | "desc";

type ReportListArgs = {
  role: UserRole;
  userId: string;
  /** للمدير/الأدمن: «all» أو معرف السيلز */
  salesUserId?: string | null;
  status: ClientStatus | ClientStatus[];
  q?: string;
  sort?: ReportSortKey;
  sortDir?: ReportSortDir;
  take?: number;
  /**
   * true: بدون ‎`take`‎ — كامل العملاء المطابِقين (فلتر مهمولين/متأخرة لا يفقد صفاً بسبب سقف ١٠٠k).
   * يُفضّل لصفحتي تقرير B / Not B.
   */
  noRowLimit?: boolean;
  /** تقرير Not B: يقصر النتائج على تصنيف واحد (classificationId أو notBClassification) */
  classificationKey?: string;
  /** تقرير تم البيع: يقصر النتائج على عملاء لهم saleDate ضمن هذا النطاق */
  saleDateRange?: { from?: Date | null; to?: Date | null };
};

function buildReportClientsListQuery(
  args: ReportListArgs
): {
  where: Prisma.ClientWhereInput;
  orderBy: Prisma.ClientOrderByWithRelationInput[];
  take: number | undefined;
} {
  let take: number | undefined;
  if (args.take !== undefined) {
    take = args.take;
  } else if (args.noRowLimit) {
    take = undefined;
  } else {
    take = MAX_CLIENT_ROWS_FOR_UI;
  }
  const statuses = Array.isArray(args.status) ? args.status : [args.status];

  const scope = clientScopeWhere({
    role: args.role,
    userId: args.userId,
    salesUserId: args.salesUserId,
  });

  const andConditions: Prisma.ClientWhereInput[] = [];
  if (args.q?.trim()) {
    andConditions.push({
      OR: [
        { name: { contains: args.q.trim() } },
        { company: { contains: args.q.trim() } },
        { phone: { contains: args.q.trim() } },
        { phone2: { contains: args.q.trim() } },
      ],
    });
  }
  if (args.classificationKey) {
    andConditions.push({
      OR: [
        { classificationId: args.classificationKey },
        { notBClassification: args.classificationKey },
      ],
    });
  }
  if (args.saleDateRange) {
    andConditions.push({
      saleDate: {
        not: null,
        ...(args.saleDateRange.from ? { gte: args.saleDateRange.from } : {}),
        ...(args.saleDateRange.to ? { lte: args.saleDateRange.to } : {}),
      },
    });
  }

  const where: Prisma.ClientWhereInput = {
    ...scope,
    status: { in: statuses },
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
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

  return { where, orderBy, take };
}

export async function listClientsForReport(args: ReportListArgs) {
  const { where, orderBy, take } = buildReportClientsListQuery(args);

  return prisma.client.findMany({
    where,
    select: clientReportExportSelect,
    orderBy,
    ...(take !== undefined ? { take } : {}),
  });
}

/** نفس فلترة تقرير الواجهة لكن بدون JSON/حقول ثقيلة — لتصدير Excel/PDF الكبير */
export async function listClientsForReportExport(
  args: ReportListArgs
): Promise<ClientReportExportRow[]> {
  const { where, orderBy, take } = buildReportClientsListQuery(args);

  return prisma.client.findMany({
    where,
    select: clientReportExportSelect,
    orderBy,
    ...(take !== undefined ? { take } : {}),
  });
}
