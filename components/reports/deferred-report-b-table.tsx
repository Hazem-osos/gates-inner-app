"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentProps } from "react";

import { DashboardFollowupSingleTableSkeleton } from "@/components/skeletons/crm-skeletons";

const ReportBTable = dynamic(
  () =>
    import("@/components/reports/report-b-table").then((m) => m.ReportBTable),
  { loading: () => <DashboardFollowupSingleTableSkeleton />, ssr: false }
);

/** يؤجّل تركيب جدول التقرير حتى بعد الانتقال — يقلّل تجميد المتصفح على الصفحات الكبيرة. */
export function DeferredReportBTable(
  props: ComponentProps<typeof ReportBTable>
) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  if (!ready) {
    return <DashboardFollowupSingleTableSkeleton />;
  }

  return <ReportBTable {...props} />;
}
