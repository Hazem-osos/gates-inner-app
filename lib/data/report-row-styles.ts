import { prisma } from "@/lib/prisma";

const STYLE_QUERY_CHUNK = 400;

/** أنماط تلوين صف التقرير لمجموعة عملاء — مشتركة لكل المستخدمين */
export async function listReportRowStylesForClients(args: {
  reportKey: string;
  clientIds: string[];
}) {
  if (args.clientIds.length === 0) return {};
  const unique = [...new Set(args.clientIds)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += STYLE_QUERY_CHUNK) {
    chunks.push(unique.slice(i, i + STYLE_QUERY_CHUNK));
  }
  const rows = (
    await Promise.all(
      chunks.map((ids) =>
        prisma.reportRowStyle.findMany({
          where: {
            reportKey: args.reportKey,
            clientId: { in: ids },
          },
          select: {
            clientId: true,
            colorKey: true,
            legendNote: true,
          },
        })
      )
    )
  ).flat();
  return Object.fromEntries(
    rows.map((r) => [
      r.clientId,
      { color: r.colorKey, legendNote: r.legendNote ?? "" },
    ])
  ) as Record<string, { color: string; legendNote: string }>;
}

/** تلوين صفوف تقرير Leads جديدة — مشترك لكل المستخدمين */
export async function listReportRowStylesForNewLeads(args: {
  reportKey: string;
  newLeadIds: string[];
}) {
  if (args.newLeadIds.length === 0) return {};
  const unique = [...new Set(args.newLeadIds)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += STYLE_QUERY_CHUNK) {
    chunks.push(unique.slice(i, i + STYLE_QUERY_CHUNK));
  }
  const rows = (
    await Promise.all(
      chunks.map((ids) =>
        prisma.reportRowStyle.findMany({
          where: {
            reportKey: args.reportKey,
            newLeadId: { in: ids },
          },
          select: {
            newLeadId: true,
            colorKey: true,
            legendNote: true,
          },
        })
      )
    )
  ).flat();
  return Object.fromEntries(
    rows
      .filter((r): r is typeof r & { newLeadId: string } => r.newLeadId != null)
      .map((r) => [
        r.newLeadId,
        { color: r.colorKey, legendNote: r.legendNote ?? "" },
      ])
  ) as Record<string, { color: string; legendNote: string }>;
}
