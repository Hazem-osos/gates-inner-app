import type { Prisma, UserRole } from "@prisma/client";
import { ClientStatus } from "@prisma/client";

import { clientReportExportSelect } from "@/lib/data/report-queries";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/report-scope";
import { startOfToday } from "@/lib/report-b-utils";

function startOfTomorrowLocal(): Date {
  const today = startOfToday();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
}

function dashboardFollowupBaseWhere(
  role: UserRole,
  userId: string,
  salesUserId?: string
): Prisma.ClientWhereInput {
  const scope = clientScopeWhere({
    role,
    userId,
    salesUserId,
  });
  return {
    ...scope,
    status: { in: [ClientStatus.B, ClientStatus.NOT_B] as ClientStatus[] },
  };
}

const dashboardFollowupOrderBy: Prisma.ClientOrderByWithRelationInput[] = [
  { nextFollowUpAt: "asc" },
  { id: "asc" },
];

/**
 * عملاء B و Not B في نطاق المستخدم — **بدون `take`** حتى تطابق لوحة «متابعات متأخرة»
 * كل المهمولين/المتأخرين حسب `passesNeglected` في التطبيق (لا يُقطع بسقف).
 */
export async function listClientsForDashboardFollowups(
  role: UserRole,
  userId: string,
  opts?: { forExport?: boolean; salesUserId?: string }
) {
  return prisma.client.findMany({
    where: dashboardFollowupBaseWhere(role, userId, opts?.salesUserId),
    orderBy: dashboardFollowupOrderBy,
    select: clientReportExportSelect,
  });
}

/** استعلام مسبق لـ «متابعات اليوم» — يُكمَّل بـ `isNextFollowUpLocalCalendarToday` في التطبيق. */
export async function listClientsForDashboardTodayFollowups(
  role: UserRole,
  userId: string,
  salesUserId?: string
) {
  const today = startOfToday();
  const tomorrow = startOfTomorrowLocal();
  return prisma.client.findMany({
    where: {
      ...dashboardFollowupBaseWhere(role, userId, salesUserId),
      nextFollowUpAt: { gte: today, lt: tomorrow },
    },
    orderBy: dashboardFollowupOrderBy,
    select: clientReportExportSelect,
  });
}

/** استعلام مسبق لـ «متابعات متأخرة/مهمولة» — يُكمَّل بـ `passesNeglected` في التطبيق. */
export async function listClientsForDashboardOverdueFollowups(
  role: UserRole,
  userId: string,
  salesUserId?: string
) {
  const today = startOfToday();
  return prisma.client.findMany({
    where: {
      ...dashboardFollowupBaseWhere(role, userId, salesUserId),
      OR: [{ nextFollowUpAt: null }, { nextFollowUpAt: { lt: today } }],
    },
    orderBy: dashboardFollowupOrderBy,
    select: clientReportExportSelect,
  });
}
