import type { ReportSortDir, ReportSortKey } from "@/lib/data/report-queries";

export function parseReportSortParams(sp: {
  sort?: string;
  dir?: string;
}): { sort: ReportSortKey | undefined; dir: ReportSortDir } {
  const sort =
    sp.sort === "days" ||
    sp.sort === "quotePrice" ||
    sp.sort === "initialCallDate" ||
    sp.sort === "nextFollowUpAt"
      ? sp.sort
      : undefined;
  const dir: ReportSortDir =
    sp.dir === "asc" || sp.dir === "desc" ? sp.dir : "desc";
  return { sort, dir };
}
