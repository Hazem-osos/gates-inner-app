import type { UserRole } from "@prisma/client";

import { listClientClassifications } from "@/lib/data/classifications";
import {
  listClientsForDashboardOverdueFollowups,
  listClientsForDashboardTodayFollowups,
} from "@/lib/data/dashboard-followups";
import { clientEntityToReportBRow } from "@/lib/mappers/client-to-report-b-row";
import type { ReportBRow } from "@/components/reports/report-b-table";
import type { ClassificationRow } from "@/lib/data/classifications";
import {
  isNextFollowUpLocalCalendarToday,
  passesNeglected,
} from "@/lib/report-b-utils";

export type DashboardFollowupBoardData = {
  classifications: ClassificationRow[];
  todayRows: ReportBRow[];
  overdueRows: ReportBRow[];
};

export async function loadDashboardFollowupBoardData(
  role: UserRole,
  userId: string,
  salesKey: string
): Promise<DashboardFollowupBoardData> {
  const [todayRows, overdueRows, classifications] = await Promise.all([
    loadDashboardTodayRows(role, userId, salesKey),
    loadDashboardOverdueRows(role, userId, salesKey),
    listClientClassifications(),
  ]);

  return { classifications, todayRows, overdueRows };
}

export async function loadDashboardTodayRows(
  role: UserRole,
  userId: string,
  salesKey: string
): Promise<ReportBRow[]> {
  const clients = await listClientsForDashboardTodayFollowups(
    role,
    userId,
    salesKey
  );
  return clients
    .map(clientEntityToReportBRow)
    .filter((r) => isNextFollowUpLocalCalendarToday(r.nextFollowUpAt));
}

export async function loadDashboardOverdueRows(
  role: UserRole,
  userId: string,
  salesKey: string
): Promise<ReportBRow[]> {
  const clients = await listClientsForDashboardOverdueFollowups(
    role,
    userId,
    salesKey
  );
  return clients
    .map(clientEntityToReportBRow)
    .filter((r) => passesNeglected(r));
}
