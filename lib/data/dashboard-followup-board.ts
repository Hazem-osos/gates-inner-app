import type { UserRole } from "@prisma/client";

import { listClientClassifications } from "@/lib/data/classifications";
import { listClientsForDashboardFollowups } from "@/lib/data/dashboard-followups";
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
  const [followupClients, classifications] = await Promise.all([
    listClientsForDashboardFollowups(role, userId, {
      salesUserId: salesKey,
    }),
    listClientClassifications(),
  ]);

  const rowsAll = followupClients.map(clientEntityToReportBRow);

  return {
    classifications,
    todayRows: rowsAll.filter((r) =>
      isNextFollowUpLocalCalendarToday(r.nextFollowUpAt)
    ),
    overdueRows: rowsAll.filter((r) => passesNeglected(r)),
  };
}
