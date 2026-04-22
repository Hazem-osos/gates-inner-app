import type { Prisma } from "@prisma/client";

import { todayInputDate } from "@/lib/date-arabic";

/** لروابط/عدّ «كل التوصيات منذ بداية النظام» (لوحة، روابط سريعة). */
export const RECOMMENDATIONS_WIDE_RANGE_START_YMD = "2010-01-01";

export type RecommendationsSearchResolved = {
  fromYmd: string;
  toYmd: string;
  fullDb: boolean;
};

/**
 * - بدون from/to وبدون full: اليوم فقط (افتراضي).
 * - full: جلب الكل من DB بدون فلترة تاريخ.
 */
export function resolveRecommendationsDateSearchParams(sp: {
  from?: string;
  to?: string;
  full?: string;
}): RecommendationsSearchResolved {
  const fullDb = sp.full === "1" || sp.full === "true";
  if (fullDb) {
    const t = todayInputDate();
    return { fromYmd: t, toYmd: t, fullDb: true };
  }
  const today = todayInputDate();
  const from = (sp.from?.trim() || sp.to?.trim() || today).slice(0, 10);
  const to = (sp.to?.trim() || sp.from?.trim() || today).slice(0, 10);
  let fromYmd = from;
  let toYmd = to;
  if (fromYmd > toYmd) [fromYmd, toYmd] = [toYmd, fromYmd];
  return { fromYmd, toYmd, fullDb: false };
}

export function ymdRangeToBounds(
  fromYmd: string,
  toYmd: string
): { rangeStart: Date; rangeEnd: Date } {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const rangeStart = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
  const rangeEnd = new Date(ty, tm - 1, td, 23, 59, 59, 999);
  return { rangeStart, rangeEnd };
}

/** يطابق تاريخ التوصية الظاهر: recommendationDate أو createdAt */
export function managementRecommendationDateWindowWhere(
  rangeStart: Date,
  rangeEnd: Date
): Prisma.ManagementRecommendationWhereInput {
  return {
    OR: [
      {
        AND: [
          { NOT: { recommendationDate: null } },
          { recommendationDate: { gte: rangeStart, lte: rangeEnd } },
        ],
      },
      {
        AND: [
          { recommendationDate: null },
          { createdAt: { gte: rangeStart, lte: rangeEnd } },
        ],
      },
    ],
  };
}

/** صفوف عمود تقرير B المعلّقة: managementRecommendationDate أو updatedAt */
export function clientPendingRecommendationDateWindowWhere(
  rangeStart: Date,
  rangeEnd: Date
): Prisma.ClientWhereInput {
  return {
    OR: [
      {
        AND: [
          { NOT: { managementRecommendationDate: null } },
          {
            managementRecommendationDate: { gte: rangeStart, lte: rangeEnd },
          },
        ],
      },
      {
        AND: [
          { managementRecommendationDate: null },
          { updatedAt: { gte: rangeStart, lte: rangeEnd } },
        ],
      },
    ],
  };
}

/**
 * سطر استعلام للروابط: يحتفظ بـ filter و sales و from و to أو full
 * عند fullDb: يضيف full=1 ولا يضيف من/إلى.
 * بلا from/to: الصفحة تفترض اليوم فقط (لا تُرسل من/إلى في الروابط).
 */
export function buildRecommendationsReportHref(args: {
  filter?: string;
  sales?: string;
  fromYmd?: string;
  toYmd?: string;
  fullDb?: boolean;
}): string {
  const p = new URLSearchParams();
  if (args.filter && args.filter !== "all") p.set("filter", args.filter);
  if (args.sales && args.sales !== "all") p.set("sales", args.sales);
  if (args.fullDb) {
    p.set("full", "1");
  } else {
    if (args.fromYmd) p.set("from", args.fromYmd);
    if (args.toYmd) p.set("to", args.toYmd);
  }
  const s = p.toString();
  return s ? `/reports/recommendations?${s}` : "/reports/recommendations";
}
