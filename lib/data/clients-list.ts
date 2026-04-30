import { ClientStatus, Prisma, type UserRole } from "@prisma/client";

import { MAX_CLIENT_ROWS_FOR_UI } from "@/lib/constants/client-query-limits";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/report-scope";

/** استعلام قائمة العملاء (بحث + فلاتر حالة/تصنيف). */
export type ClientsListQuery = {
  q?: string | null;
  /** غير مغلق — استبعاد حالة «تم الإغلاق» (LOST) */
  notClosed?: boolean;
  /** تم الإغلاق — LOST فقط */
  closedLost?: boolean;
  /** تم البيع — WON فقط */
  won?: boolean;
  /** لم يتم البيع — استبعاد WON */
  notWon?: boolean;
  /** `none` أو معرف التصنيف؛ غير مُعرّف أو `all` = بدون فلتر تصنيف */
  classificationKey?: string | null;
};

export function clientsListQueryFromSearchParams(
  sp: URLSearchParams | Record<string, string | undefined>,
  opts?: { validClassificationIds?: Set<string> }
): ClientsListQuery {
  const get = (k: string): string | undefined =>
    sp instanceof URLSearchParams ? sp.get(k) ?? undefined : sp[k];

  const q = get("q")?.trim() || undefined;
  const out: ClientsListQuery = {};
  if (q) out.q = q;
  if (get("f_nc") === "1") out.notClosed = true;
  if (get("f_cl") === "1") out.closedLost = true;
  if (get("f_won") === "1") out.won = true;
  if (get("f_nw") === "1") out.notWon = true;

  const clsRaw = get("cls")?.trim() ?? "";
  if (clsRaw === "none") {
    out.classificationKey = "none";
  } else if (clsRaw && clsRaw !== "all") {
    const ok =
      !opts?.validClassificationIds || opts.validClassificationIds.has(clsRaw);
    if (ok) out.classificationKey = clsRaw;
  }

  return out;
}

/** فلتر القائمة: نطاق السيلز + بحث + حالة/تصنيف. */
export function buildClientsListWhere(
  role: UserRole,
  userId: string,
  salesUserId?: string | null,
  query?: ClientsListQuery | null
): Prisma.ClientWhereInput {
  const base = clientScopeWhere({ role, userId, salesUserId });
  const parts: Prisma.ClientWhereInput[] = [base];

  const t = query?.q?.trim();
  if (t) {
    parts.push({
      OR: [
        { name: { contains: t } },
        { company: { contains: t } },
        { phone: { contains: t } },
        { phone2: { contains: t } },
      ],
    });
  }

  const statusFilters: Prisma.ClientWhereInput[] = [];
  if (query?.notClosed) {
    statusFilters.push({ NOT: { status: ClientStatus.LOST } });
  }
  if (query?.closedLost) {
    statusFilters.push({ status: ClientStatus.LOST });
  }
  if (query?.won) {
    statusFilters.push({ status: ClientStatus.WON });
  }
  if (query?.notWon) {
    statusFilters.push({ NOT: { status: ClientStatus.WON } });
  }
  if (statusFilters.length > 0) {
    parts.push({ AND: statusFilters });
  }

  const ck = query?.classificationKey?.trim();
  if (ck && ck !== "all") {
    if (ck === "none") {
      parts.push({ classificationId: null });
    } else {
      parts.push({ classificationId: ck });
    }
  }

  if (parts.length === 1) return parts[0]!;
  return { AND: parts };
}

export async function listClientsForUser(
  role: UserRole,
  userId: string,
  salesUserId?: string | null,
  query?: ClientsListQuery | null
) {
  const where = buildClientsListWhere(role, userId, salesUserId, query);

  return prisma.client.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      company: true,
      phone: true,
      phone2: true,
      status: true,
      nextFollowUpAt: true,
      initialCallDate: true,
      assignedUser: { select: { name: true, deletedAt: true } },
      classification: { select: { label: true } },
    },
    take: MAX_CLIENT_ROWS_FOR_UI,
  });
}
