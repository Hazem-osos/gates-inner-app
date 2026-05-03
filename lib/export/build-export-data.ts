import { ClientStatus, Prisma, type UserRole } from "@prisma/client";
import { addDays, endOfDay, isWithinInterval, startOfDay } from "date-fns";

import { MAX_CLIENT_ROWS_FOR_UI } from "@/lib/constants/client-query-limits";
import { formatExportDateOnly, todayInputDate } from "@/lib/date-arabic";
import {
  clientsListQueryFromSearchParams,
  listClientsForUser,
} from "@/lib/data/clients-list";
import { listClientsForDashboardFollowups } from "@/lib/data/dashboard-followups";
import type { ReportSortDir, ReportSortKey } from "@/lib/data/report-queries";
import { listClientsForReportExport } from "@/lib/data/report-queries";
import { reportBRowToExportRecord } from "@/lib/export/report-b-flat";
import { clientEntityToReportBRow } from "@/lib/mappers/client-to-report-b-row";
import {
  isNextFollowUpLocalCalendarToday,
  passesNeglected,
} from "@/lib/report-b-utils";
import { authorNamesByClientAndBody } from "@/lib/recommendation-author-lookup";
import {
  clientPendingRecommendationDateWindowWhere,
  managementRecommendationDateWindowWhere,
  resolveRecommendationsDateSearchParams,
  ymdRangeToBounds,
} from "@/lib/recommendations-report-search";
import { transferredReportWhere } from "@/lib/data/client-transfers-report";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/report-scope";
import { buildClientsImportTemplateEmptyRow } from "@/lib/import/clients-flat-import-fields";
import { userDisplayName } from "@/lib/user-display-name";

export type ExportSheet = {
  sheetName: string;
  rows: Record<string, string>[];
};

export type BuildExportResult = {
  filename: string;
  documentTitle: string;
  sheets: ExportSheet[];
};

type SessionUser = { id: string; role: UserRole };

function rowBShort(c: {
  name: string;
  phone: string;
  company?: string | null;
  status: string;
  nextFollowUpAt: Date | null;
  initialCallDate: Date | null;
  assignedUser?: { name: string; deletedAt: Date | null } | null;
}): Record<string, string> {
  return {
    الاسم: c.name,
    الهاتف: c.phone,
    الشركة: c.company ?? "",
    الحالة: c.status,
    متابعة_تالية: formatExportDateOnly(c.nextFollowUpAt),
    اتصال_أول: formatExportDateOnly(c.initialCallDate),
    سيلز: c.assignedUser ? userDisplayName(c.assignedUser) : "",
  };
}

/** يمرّر معاملات الطلب كما في صفحات التقارير */
export async function buildExportPayload(
  kind: string,
  sp: URLSearchParams,
  user: SessionUser
): Promise<BuildExportResult> {
  if (kind === "clients-import-template") {
    return {
      filename: "قالب_استيراد_عملاء.xlsx",
      documentTitle: "قالب استيراد عملاء",
      sheets: [
        {
          sheetName: "عملاء",
          rows: [buildClientsImportTemplateEmptyRow()],
        },
      ],
    };
  }

  if (kind === "clients-list") {
    const salesRaw = sp.get("sales")?.trim();
    const salesUserId =
      salesRaw && salesRaw !== "all" ? salesRaw : undefined;
    const listQuery = clientsListQueryFromSearchParams(sp);
    const clients = await listClientsForUser(
      user.role,
      user.id,
      salesUserId,
      listQuery
    );
    const rows = clients.map((c) => rowBShort(c));
    return {
      filename: "قائمة_العملاء.xlsx",
      documentTitle: "قائمة العملاء",
      sheets: [{ sheetName: "العملاء", rows }],
    };
  }

  if (kind === "report-transferred") {
    const fromSales = sp.get("fromSales")?.trim() ?? "all";
    const toSales = sp.get("toSales")?.trim() ?? "all";
    const where = transferredReportWhere(
      user.role,
      user.id,
      fromSales,
      toSales
    );
    const transfers = await prisma.clientTransfer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: {
        client: {
          select: { name: true, phone: true, company: true },
        },
        fromUser: { select: { name: true, deletedAt: true } },
        toUser: { select: { name: true, deletedAt: true } },
      },
    });
    const rows = transfers.map((t) => ({
      العميل: t.client.name,
      الهاتف: t.client.phone,
      الشركة: t.client.company ?? "",
      من_السيلز: t.fromUser ? userDisplayName(t.fromUser) : "",
      إلى_السيلز: t.toUser ? userDisplayName(t.toUser) : "",
      تاريخ_النقل: formatExportDateOnly(t.createdAt),
      تم_الاطلاع: t.acknowledgedAt
        ? formatExportDateOnly(t.acknowledgedAt)
        : "لا",
    }));
    return {
      filename: "عملاء_منقولون.xlsx",
      documentTitle: "عملاء منقولون",
      sheets: [{ sheetName: "منقولون", rows }],
    };
  }

  if (kind === "report-warming") {
    const mode = sp.get("mode") === "overdue" ? "overdue" : "all";
    const salesKey = sp.get("sales")?.trim() ?? "all";
    const scope = clientScopeWhere({
      role: user.role,
      userId: user.id,
      salesUserId: salesKey,
    });

    const clients = await prisma.client.findMany({
      where: scope,
      select: {
        id: true,
        name: true,
        activity: true,
        phone: true,
        initialCallDate: true,
        clientWarmingText: true,
        warmingTools: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            day1Done: true,
            day2Done: true,
            day3Done: true,
            day2Content: true,
            day3Content: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: MAX_CLIENT_ROWS_FOR_UI,
    });

    const today = new Date();
    let list = clients;
    if (mode === "overdue") {
      const t = startOfDay(today);
      list = clients.filter((c) => {
        const w = c.warmingTools[0];
        if (!c.initialCallDate) return false;
        const c0 = startOfDay(c.initialCallDate);
        const d1 = c0;
        const d2 = addDays(c0, 1);
        const d3 = addDays(c0, 2);
        return (
          (d1 <= t && !w?.day1Done) ||
          (d2 <= t && !w?.day2Done) ||
          (d3 <= t && !w?.day3Done)
        );
      });
    }

    const rows = list.map((c) => {
      const w = c.warmingTools[0];
      const contact = formatExportDateOnly(c.initialCallDate);
      return {
        العميل: c.name,
        النشاط: c.activity ?? "",
        تاريخ_الاتصال: contact,
        الهاتف: c.phone,
        اليوم_الأول: c.clientWarmingText ?? "",
        اليوم_الثاني: w?.day2Content ?? "",
        اليوم_الثالث: w?.day3Content ?? "",
        تم_اليوم1: w?.day1Done ? "نعم" : "لا",
        تم_اليوم2: w?.day2Done ? "نعم" : "لا",
        تم_اليوم3: w?.day3Done ? "نعم" : "لا",
      };
    });

    return {
      filename: "warming.xlsx",
      documentTitle: "أدوات Warming",
      sheets: [{ sheetName: "Warming", rows }],
    };
  }

  if (kind === "report-recommendations") {
    const filter = sp.get("filter") ?? "all";
    const salesKeyParam = sp.get("sales") ?? "all";
    const dateResolved = resolveRecommendationsDateSearchParams({
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      full: sp.get("full") ?? undefined,
    });
    const { fromYmd, toYmd, fullDb: fullDbView } = dateResolved;
    const { rangeStart, rangeEnd } = ymdRangeToBounds(fromYmd, toYmd);

    /** يطابق صفحة التقرير: user.id = معرّف DB من مسار التصدير */
    const recommendationWhereBase: Prisma.ManagementRecommendationWhereInput =
      user.role === "SALES"
        ? { targetUserId: user.id }
        : salesKeyParam !== "all"
          ? { targetUserId: salesKeyParam }
          : {};

    const recommendationWhere: Prisma.ManagementRecommendationWhereInput =
      !fullDbView
        ? {
            AND: [
              recommendationWhereBase,
              managementRecommendationDateWindowWhere(
                rangeStart,
                rangeEnd
              ),
            ],
          }
        : recommendationWhereBase;

    const allRecRows = await prisma.managementRecommendation.findMany({
      where: recommendationWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        client: {
          include: { assignedUser: true },
        },
        author: true,
        targetUser: true,
      },
    });

    const recKeysForDedupe = new Set(
      allRecRows.map((r) => `${r.clientId}\0${r.body.trim()}`)
    );

    let rowsDb = allRecRows;
    if (filter === "pending") {
      rowsDb = rowsDb.filter((r) => !(r.actionTaken ?? "").trim());
    } else if (filter === "done") {
      rowsDb = rowsDb.filter((r) => !!(r.actionTaken ?? "").trim());
    }

    const clientWhereBase: Prisma.ClientWhereInput = {
      managementRecommendationText: { not: null },
      ...(user.role === "SALES"
        ? { assignedUserId: user.id }
        : salesKeyParam !== "all"
          ? { assignedUserId: salesKeyParam }
          : {}),
    };

    const clientWhere: Prisma.ClientWhereInput = !fullDbView
      ? {
          AND: [
            clientWhereBase,
            clientPendingRecommendationDateWindowWhere(
              rangeStart,
              rangeEnd
            ),
          ],
        }
      : clientWhereBase;

    const clientsWithReportText = await prisma.client.findMany({
      where: clientWhere,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        company: true,
        updatedAt: true,
        managementRecommendationText: true,
        managementRecommendationDate: true,
        assignedUser: true,
      },
    });

    type RecExportRow = Record<string, string>;

    const salesLine = (
      t: Parameters<typeof userDisplayName>[0],
      fallback: Parameters<typeof userDisplayName>[0]
    ) => {
      const a = t ?? fallback;
      return a ? userDisplayName(a) : "";
    };

    const merged: { sortMs: number; row: RecExportRow }[] = rowsDb.map(
      (r) => ({
        sortMs: new Date(
          r.recommendationDate ?? r.createdAt
        ).getTime(),
        row: {
          العميل: r.client?.name ?? "",
          الشركة: r.client?.company ?? "",
          سيلز: salesLine(r.targetUser, r.client?.assignedUser),
          التوصية: r.body,
          تاريخ_التوصية: formatExportDateOnly(
            r.recommendationDate ?? r.createdAt
          ),
          من_كتب: userDisplayName(r.author),
          تاريخ_العمل: formatExportDateOnly(r.workDate),
          الإجراء_المتخذ: r.actionTaken ?? "",
        },
      })
    );

    if (filter !== "done") {
      const exportClientOnly: { c: (typeof clientsWithReportText)[0]; t: string; key: string }[] = [];
      for (const c of clientsWithReportText) {
        const t = (c.managementRecommendationText ?? "").trim();
        if (!t) continue;
        const key = `${c.id}\0${t}`;
        if (recKeysForDedupe.has(key)) continue;
        exportClientOnly.push({ c, t, key });
      }

      const authorByKey = await authorNamesByClientAndBody(
        exportClientOnly.map((x) => ({ clientId: x.c.id, body: x.t })),
        recommendationWhereBase
      );

      for (const { c, t, key } of exportClientOnly) {
        merged.push({
          sortMs: new Date(
            c.managementRecommendationDate ?? c.updatedAt
          ).getTime(),
          row: {
            العميل: c.name,
            الشركة: c.company ?? "",
            سيلز: c.assignedUser ? userDisplayName(c.assignedUser) : "",
            التوصية: t,
            تاريخ_التوصية: formatExportDateOnly(
              c.managementRecommendationDate ?? c.updatedAt
            ),
            من_كتب: authorByKey.get(key) ?? "—",
            تاريخ_العمل: "",
            الإجراء_المتخذ: "",
          },
        });
      }
    }

    merged.sort((a, b) => b.sortMs - a.sortMs);
    const rows = merged.map((m) => m.row);

    return {
      filename: "توصيات_الإدارة.xlsx",
      documentTitle: "توصيات الإدارة",
      sheets: [{ sheetName: "توصيات", rows }],
    };
  }

  if (kind === "dashboard-followups") {
    const salesKey = sp.get("sales")?.trim() ?? "all";
    const followupClients = await listClientsForDashboardFollowups(
      user.role,
      user.id,
      { forExport: true, salesUserId: salesKey }
    );
    const rowsAll = followupClients.map(clientEntityToReportBRow);
    const todayRows = rowsAll.filter((r) =>
      isNextFollowUpLocalCalendarToday(r.nextFollowUpAt)
    );

    const overdueRows = rowsAll.filter((r) => passesNeglected(r));

    const toFlat = (label: string, list: typeof rowsAll) =>
      list.map((r) => ({
        القسم: label,
        ...reportBRowToExportRecord(r),
      }));

    return {
      filename: "لوحة_المتابعات.xlsx",
      documentTitle: "لوحة المتابعات",
      sheets: [
        {
          sheetName: "متابعات_اليوم",
          rows:
            todayRows.length > 0
              ? toFlat("اليوم", todayRows)
              : [{ رسالة: "لا متابعات اليوم" }],
        },
        {
          sheetName: "متأخر",
          rows:
            overdueRows.length > 0
              ? toFlat("متأخر", overdueRows)
              : [{ رسالة: "لا تأخير" }],
        },
      ],
    };
  }

  if (kind === "report-calls") {
    const fromStr = sp.get("from")?.trim() || todayInputDate();
    const toStr = sp.get("to")?.trim() || todayInputDate();
    const from = startOfDay(new Date(fromStr));
    const to = endOfDay(new Date(toStr));
    const salesKey = sp.get("sales")?.trim() ?? "all";
    const scheduledFilter = sp.get("scheduled")?.trim() ?? "all";

    const scope = clientScopeWhere({
      role: user.role,
      userId: user.id,
      salesUserId: salesKey,
    });

    const clients = await prisma.client.findMany({
      where: { ...scope, createdAt: { gte: from, lte: to } },
      include: {
        assignedUser: true,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_CLIENT_ROWS_FOR_UI,
    });

    const filtered = clients.filter((c) => {
      const hasVisit = Boolean(c.visitAppointmentDate);
      const scheduledRow =
        c.visitAppointmentScheduled || hasVisit ? true : false;
      if (scheduledFilter === "yes") return scheduledRow;
      if (scheduledFilter === "no") return !scheduledRow;
      return true;
    });

    const rows = filtered.map((c) => ({
      سيلز: c.assignedUser ? userDisplayName(c.assignedUser) : "",
      العميل: c.name,
      الشركة: c.company?.trim() ?? "",
      تاريخ_الإدخال: formatExportDateOnly(c.createdAt),
      النشاط: c.activity ?? "",
      العنوان: c.address ?? "",
      تاريخ_الزيارة: formatExportDateOnly(c.visitAppointmentDate),
      محدد_ميعاد:
        c.visitAppointmentScheduled || c.visitAppointmentDate ? "نعم" : "لا",
    }));

    return {
      filename: "report-calls.xlsx",
      documentTitle: "عملاء جدد / المواعيد",
      sheets: [{ sheetName: "عملاء_جدد_مواعيد", rows }],
    };
  }

  let status: ClientStatus | ClientStatus[] = ClientStatus.B;
  let sheetName = "عملاء_B";

  if (kind === "report-not-b") {
    status = ClientStatus.NOT_B;
    sheetName = "عملاء_Not_B";
  } else if (kind === "report-closed") {
    status = ClientStatus.LOST;
    sheetName = "مغلقة";
  } else if (kind === "report-won") {
    status = ClientStatus.WON;
    sheetName = "تم_البيع";
  }

  const salesRaw = sp.get("sales")?.trim();
  const salesUserId = salesRaw && salesRaw !== "all" ? salesRaw : undefined;

  const spSort = sp.get("sort");
  const sort: ReportSortKey | undefined =
    spSort === "days" ||
    spSort === "quotePrice" ||
    spSort === "initialCallDate" ||
    spSort === "nextFollowUpAt"
      ? spSort
      : undefined;
  const spDir = sp.get("dir");
  const sortDir: ReportSortDir =
    spDir === "asc" || spDir === "desc" ? spDir : "desc";

  let clients = await listClientsForReportExport({
    role: user.role,
    userId: user.id,
    salesUserId,
    status,
    q: sp.get("q")?.trim() || undefined,
    sort,
    sortDir,
    noRowLimit:
      kind === "report-b" ||
      kind === "report-not-b" ||
      kind === "report-won" ||
      kind === "report-closed",
  });

  if (kind === "report-not-b") {
    const classKey = sp.get("class")?.trim();
    if (classKey && classKey !== "all") {
      clients = clients.filter(
        (c) =>
          c.classificationId === classKey || c.notBClassification === classKey
      );
    }
  }

  if (kind === "report-closed") {
    const classKeyClosed = sp.get("class")?.trim();
    if (classKeyClosed && classKeyClosed !== "all") {
      clients = clients.filter(
        (c) =>
          c.classificationId === classKeyClosed ||
          c.notBClassification === classKeyClosed
      );
    }
  }

  if (kind === "report-won") {
    const from = sp.get("from")?.trim();
    const to = sp.get("to")?.trim();
    const fromD = from ? startOfDay(new Date(from)) : null;
    const toD = to ? endOfDay(new Date(to)) : null;
    clients = clients.filter((c) => {
      if (!c.saleDate) return false;
      if (fromD && c.saleDate < fromD) return false;
      if (toD && c.saleDate > toD) return false;
      return true;
    });
  }

  let rows: Record<string, string>[];

  if (kind === "report-won") {
    rows = clients.map((c) => ({
      ...reportBRowToExportRecord(clientEntityToReportBRow(c)),
      تاريخ_البيع: formatExportDateOnly(c.saleDate),
      قيمة_العقد: c.contractValue?.toString() ?? "",
    }));
  } else {
    rows = clients.map((c) =>
      reportBRowToExportRecord(clientEntityToReportBRow(c))
    );
  }

  const fn = `${kind}.xlsx`;
  const titles: Record<string, string> = {
    "report-b": "تقرير عملاء B",
    "report-not-b": "تقرير Not B",
    "report-closed": "عملاء مغلقة",
    "report-won": "تم البيع",
  };

  return {
    filename: fn,
    documentTitle: titles[kind] ?? "تصدير",
    sheets: [{ sheetName, rows }],
  };
}
