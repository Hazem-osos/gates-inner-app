import { ClientStatus, type UserRole } from "@prisma/client";
import { addDays, endOfDay, isWithinInterval, startOfDay } from "date-fns";

import { formatExportDateOnly, todayInputDate } from "@/lib/date-arabic";
import { listClientsForUser } from "@/lib/data/clients-list";
import { listClientsForDashboardFollowups } from "@/lib/data/dashboard-followups";
import type { ReportSortDir, ReportSortKey } from "@/lib/data/report-queries";
import { listClientsForReport } from "@/lib/data/report-queries";
import { reportBRowToExportRecord } from "@/lib/export/report-b-flat";
import { clientEntityToReportBRow } from "@/lib/mappers/client-to-report-b-row";
import { passesNeglected } from "@/lib/report-b-utils";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/report-scope";

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
  assignedUser?: { name: string } | null;
}): Record<string, string> {
  return {
    الاسم: c.name,
    الهاتف: c.phone,
    الشركة: c.company ?? "",
    الحالة: c.status,
    متابعة_تالية: formatExportDateOnly(c.nextFollowUpAt),
    اتصال_أول: formatExportDateOnly(c.initialCallDate),
    سيلز: c.assignedUser?.name ?? "",
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
          rows: [
            {
              اسم_العميل: "مثال",
              الهاتف: "01234567890",
              الشركة: "اختياري",
              المسمى_الوظيفي: "اختياري",
              العنوان: "اختياري",
            },
          ],
        },
      ],
    };
  }

  if (kind === "clients-list") {
    const salesRaw = sp.get("sales")?.trim();
    const salesUserId =
      salesRaw && salesRaw !== "all" ? salesRaw : undefined;
    const q = sp.get("q")?.trim() || undefined;
    const clients = await listClientsForUser(
      user.role,
      user.id,
      salesUserId,
      q
    );
    const rows = clients.map((c) => rowBShort(c));
    return {
      filename: "قائمة_العملاء.xlsx",
      documentTitle: "قائمة العملاء",
      sheets: [{ sheetName: "العملاء", rows }],
    };
  }

  if (kind === "report-transferred") {
    const transfers = await prisma.clientTransfer.findMany({
      where: {
        toUserId: user.id,
        acknowledgedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: { name: true, phone: true, company: true },
        },
        fromUser: { select: { name: true } },
      },
    });
    const rows = transfers.map((t) => ({
      العميل: t.client.name,
      الهاتف: t.client.phone,
      الشركة: t.client.company ?? "",
      من_السيلز: t.fromUser?.name ?? "",
      تاريخ_النقل: formatExportDateOnly(t.createdAt),
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
      take: 800,
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
    const salesKey = sp.get("sales") ?? "all";
    const clientScope =
      user.role === "SALES"
        ? { assignedUserId: user.id }
        : salesKey !== "all"
          ? { assignedUserId: salesKey }
          : {};

    let rowsDb = await prisma.managementRecommendation.findMany({
      where: { client: clientScope },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        client: {
          select: {
            name: true,
            assignedUser: { select: { name: true } },
          },
        },
        author: { select: { name: true } },
      },
    });

    if (filter === "pending") {
      rowsDb = rowsDb.filter((r) => !(r.actionTaken ?? "").trim());
    } else if (filter === "done") {
      rowsDb = rowsDb.filter((r) => !!(r.actionTaken ?? "").trim());
    }

    const rows = rowsDb.map((r) => ({
      العميل: r.client?.name ?? "",
      سيلز: r.client?.assignedUser?.name ?? "",
      التوصية: r.body,
      تاريخ_التوصية:
        formatExportDateOnly(r.recommendationDate ?? r.createdAt),
      من_كتب: r.author.name,
      تاريخ_العمل: formatExportDateOnly(r.workDate),
      الإجراء_المتخذ: r.actionTaken ?? "",
    }));

    return {
      filename: "توصيات_الإدارة.xlsx",
      documentTitle: "توصيات الإدارة",
      sheets: [{ sheetName: "توصيات", rows }],
    };
  }

  if (kind === "dashboard-followups") {
    const followupClients = await listClientsForDashboardFollowups(
      user.role,
      user.id
    );
    const rowsAll = followupClients.map(clientEntityToReportBRow);
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const todayRows = rowsAll.filter((r) => {
      if (!r.nextFollowUpAt) return false;
      const d = new Date(r.nextFollowUpAt);
      return isWithinInterval(d, { start: todayStart, end: todayEnd });
    });

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
    const dateMode = sp.get("dateMode") === "initial" ? "initial" : "created";
    const scheduledFilter = sp.get("scheduled")?.trim() ?? "all";

    const scope = clientScopeWhere({
      role: user.role,
      userId: user.id,
      salesUserId: salesKey,
    });

    const clients = await prisma.client.findMany({
      where:
        dateMode === "initial"
          ? { ...scope, initialCallDate: { gte: from, lte: to } }
          : { ...scope, createdAt: { gte: from, lte: to } },
      include: {
        assignedUser: { select: { name: true } },
      },
      orderBy:
        dateMode === "initial"
          ? { initialCallDate: "desc" }
          : { createdAt: "desc" },
      take: 800,
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
      سيلز: c.assignedUser?.name ?? "",
      العميل: c.name,
      مرجع_التاريخ:
        dateMode === "initial"
          ? formatExportDateOnly(c.initialCallDate)
          : formatExportDateOnly(c.createdAt),
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

  let clients = await listClientsForReport({
    role: user.role,
    userId: user.id,
    salesUserId,
    status,
    q: sp.get("q")?.trim() || undefined,
    sort,
    sortDir,
    take: 4000,
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
