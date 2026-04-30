import type { NewLeadReachStatus, Prisma } from "@prisma/client";
import { ClientStatus } from "@prisma/client";

import type { ClassificationRow } from "@/lib/data/classifications";
import { listClientClassifications } from "@/lib/data/classifications";
import { prisma } from "@/lib/prisma";
import { userDisplayName } from "@/lib/user-display-name";

export type NewLeadReportRow = {
  id: string;
  /** وقت إنشاء السجل في النظام (ISO 8601) */
  createdAt: string;
  entryYmd: string;
  phone: string;
  adText: string;
  salesName: string;
  reachStatus: NewLeadReachStatus;
  /** تصنيف الليد (B/C/Z/EXPIRED) — للفلترة والأزرار فقط، لا يُعرض في عمود التصنيف */
  leadCategory: string | null;
  clientId: string | null;
  /** نص تصنيف بطاقة العميل المرتبطة — يُعرض في الجدول فقط عند وجود `clientId` */
  clientClassificationLabel: string | null;
};

/** إجمالي لكل تصنيف عميل من الإدارة — يتزامن مع أسماء التصنيفات في قاعدة البيانات */
export type NewLeadReportClassificationTotal = {
  id: string;
  label: string;
  count: number;
};

export type NewLeadReportStats = {
  notReached: number;
  reached: number;
  /** مسجّل من زر «عميل سيء» — leadCategory = Z */
  leadMarkedBadClient: number;
  /** مسجّل من زر «Expired» */
  leadMarkedExpired: number;
  byClientClassification: NewLeadReportClassificationTotal[];
  /** بطاقة مرتبطة بحالة تم البيع */
  linkedWon: number;
  /** بطاقة مرتبطة بحالة تم الإغلاق */
  linkedLost: number;
  /**
   * بطاقة مرتبطة (B / Not B) بدون `classificationId` — يظهر في العمود كنصّ احتياطي
   */
  linkedWithoutClassification: number;
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

/** قيمة GET ‎reach‎ — «لم يتم الوصول» دون ما عُيّن زر Expired (أخضر) */
export const NEW_LEADS_REPORT_REACH_NOT_REACHED_EXCL_EXPIRED =
  "NOT_REACHED_EXCL_EXPIRED";

function normalizeCat(v: string | null | undefined): string | null {
  if (v == null || v === "") return null;
  return v.trim().toUpperCase();
}

function clientClassificationDisplayText(
  client: {
    status: ClientStatus;
    classification: { label: string } | null;
    notBClassification: string | null;
  } | null
): string | null {
  if (!client) return null;
  if (client.status === ClientStatus.WON) return "تم البيع";
  if (client.status === ClientStatus.LOST) return "تم الإغلاق";
  const cls = client.classification?.label?.trim();
  if (cls) return cls;
  const legacy = client.notBClassification?.trim();
  if (legacy) return legacy;
  if (client.status === ClientStatus.B) return "عميل B";
  if (client.status === ClientStatus.NOT_B) return "عميل Not B";
  return null;
}

function buildNewLeadReportStats(
  rawRows: Array<{
    reachStatus: NewLeadReachStatus;
    leadCategory: string | null;
    client: {
      status: ClientStatus;
      classificationId: string | null;
    } | null;
  }>,
  classifications: ClassificationRow[]
): NewLeadReportStats {
  const reached = rawRows.filter((r) => r.reachStatus === "REACHED").length;
  const notReached = rawRows.filter((r) => r.reachStatus === "NOT_REACHED").length;

  const leadMarkedBadClient = rawRows.filter(
    (r) => normalizeCat(r.leadCategory) === "Z"
  ).length;
  const leadMarkedExpired = rawRows.filter(
    (r) => normalizeCat(r.leadCategory) === "EXPIRED"
  ).length;

  const pipelineCountsTowardClassification = (
    cl: NonNullable<(typeof rawRows)[number]["client"]>
  ) =>
    cl.status !== ClientStatus.WON && cl.status !== ClientStatus.LOST;

  const byClientClassification = classifications.map((c) => ({
    id: c.id,
    label: c.label,
    count: rawRows.filter((r) => {
      const cl = r.client;
      if (!cl || !pipelineCountsTowardClassification(cl)) return false;
      return cl.classificationId === c.id;
    }).length,
  }));

  const linkedWon = rawRows.filter(
    (r) => r.client?.status === ClientStatus.WON
  ).length;
  const linkedLost = rawRows.filter(
    (r) => r.client?.status === ClientStatus.LOST
  ).length;
  const linkedWithoutClassification = rawRows.filter((r) => {
    const cl = r.client;
    if (!cl || !pipelineCountsTowardClassification(cl)) return false;
    return !cl.classificationId;
  }).length;

  return {
    reached,
    notReached,
    leadMarkedBadClient,
    leadMarkedExpired,
    byClientClassification,
    linkedWon,
    linkedLost,
    linkedWithoutClassification,
  };
}

export async function listNewLeadsForReport(
  filters: NewLeadReportFilters,
  opts?: { classifications?: ClassificationRow[] }
): Promise<{ rows: NewLeadReportRow[]; stats: NewLeadReportStats }> {
  const { fromYmd, toYmd, salesUserId, adQ, phoneQ, reach, category } = filters;

  const classifications =
    opts?.classifications ?? (await listClientClassifications());
  const validClassIds = new Set(classifications.map((c) => c.id));

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
  } else if (reach === NEW_LEADS_REPORT_REACH_NOT_REACHED_EXCL_EXPIRED) {
    andParts.push({
      reachStatus: "NOT_REACHED",
      OR: [
        { leadCategory: null },
        { leadCategory: { not: "EXPIRED" } },
      ],
    });
  } else if (reach === "REACHED") {
    andParts.push({ reachStatus: "REACHED" });
  }
  if (category === "__empty__") {
    andParts.push({
      OR: [
        { clientId: null },
        {
          client: {
            is: {
              status: { notIn: [ClientStatus.WON, ClientStatus.LOST] },
              classificationId: null,
            },
          },
        },
      ],
    });
  } else if (category && category !== "all" && validClassIds.has(category)) {
    andParts.push({
      client: {
        is: {
          status: { notIn: [ClientStatus.WON, ClientStatus.LOST] },
          classificationId: category,
        },
      },
    });
  }

  const where: Prisma.NewLeadWhereInput =
    andParts.length === 1 ? andParts[0]! : { AND: andParts };

  const rawRows = await prisma.newLead.findMany({
    where,
    orderBy: [{ entryYmd: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    include: {
      createdBy: { select: { name: true, deletedAt: true } },
      client: {
        select: {
          status: true,
          classificationId: true,
          classification: { select: { label: true } },
          notBClassification: true,
        },
      },
    },
  });

  const rows: NewLeadReportRow[] = rawRows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    entryYmd: r.entryYmd,
    phone: r.phone,
    adText: r.adText,
    salesName: userDisplayName(r.createdBy),
    reachStatus: r.reachStatus,
    leadCategory: normalizeCat(r.leadCategory),
    clientId: r.clientId,
    clientClassificationLabel: clientClassificationDisplayText(r.client),
  }));

  const stats = buildNewLeadReportStats(rawRows, classifications);

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
