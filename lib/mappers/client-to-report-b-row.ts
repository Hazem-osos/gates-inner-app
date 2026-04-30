import type { Client, ClientClassification, User } from "@prisma/client";
import type { ReportBRow } from "@/components/reports/report-b-table";
import type { ClientReportExportRow } from "@/lib/data/report-queries";
import { sanitizeDisplayLabel } from "@/lib/display-text";
import { userDisplayName } from "@/lib/user-display-name";

type ClientWithReportInc = Client & {
  assignedUser?: Pick<User, "id" | "name" | "deletedAt"> | null;
  classification?:
    | (Pick<
        ClientClassification,
        "id" | "label" | "color" | "isBRow"
      > & { isBRow: boolean })
    | null;
};

export function clientEntityToReportBRow(
  c: ClientWithReportInc | ClientReportExportRow
): ReportBRow {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    phone2: c.phone2 ?? null,
    company: c.company ?? null,
    position: c.position ?? null,
    address: c.address ?? null,
    activity: c.activity ?? null,
    status: c.status,
    initialCallDate: c.initialCallDate?.toISOString() ?? null,
    nextFollowUpAt: c.nextFollowUpAt?.toISOString() ?? null,
    quotePrice: c.quotePrice?.toString() ?? null,
    quoteDetail: c.quoteDetail ?? null,
    managementRecommendationText: c.managementRecommendationText ?? null,
    managementRecommendationDate:
      c.managementRecommendationDate?.toISOString() ?? null,
    currentSituation: c.currentSituation ?? null,
    adPlatform: c.adPlatform ?? null,
    sourceAdName: c.sourceAdName ?? null,
    callSummary: c.callSummary ?? null,
    salesNotes: c.salesNotes ?? null,
    finalStatusNote: c.finalStatusNote ?? null,
    clientWarmingText: c.clientWarmingText ?? null,
    visitAppointmentScheduled: c.visitAppointmentScheduled,
    visitAppointmentDate: c.visitAppointmentDate?.toISOString() ?? null,
    presentingEmployeeName: c.presentingEmployeeName ?? null,
    qqAnswer: c.qqAnswer,
    assignedUserName: c.assignedUser
      ? userDisplayName(c.assignedUser)
      : null,
    classificationId: c.classificationId ?? null,
    classificationLabel:
      c.classification?.label != null
        ? sanitizeDisplayLabel(c.classification.label)
        : null,
    classificationColor: c.classification?.color ?? null,
    followUpSlots: c.followUpSlots,
    closedLostAt:
      c.status === "LOST" ? c.closedLostAt?.toISOString() ?? null : undefined,
    lossReason: c.status === "LOST" ? c.lossReason ?? null : undefined,
    saleDate: c.saleDate?.toISOString() ?? null,
    contractValue: c.contractValue != null ? c.contractValue.toString() : null,
  };
}
