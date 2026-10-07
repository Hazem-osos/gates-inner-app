import Link from "next/link";

import type { ReportBRow } from "@/components/reports/report-b-table";
import { formatDateArabicLong } from "@/lib/date-arabic";
import { parseIsoDate } from "@/lib/report-b-utils";
import { cn } from "@/lib/utils";

const PREVIEW_LIMIT = 25;

function formatNextFollowUpLabel(iso: string | null | undefined): string {
  const raw = (iso ?? "").trim();
  if (!raw) return "—";
  const d = parseIsoDate(raw);
  if (!d) return "غير صالح";
  return formatDateArabicLong(d);
}

export function DashboardFollowupPreview({
  rows,
  tone,
}: {
  rows: ReportBRow[];
  tone: "today" | "overdue";
}) {
  const shown = rows.slice(0, PREVIEW_LIMIT);
  const rest = rows.length - shown.length;

  const rowClass =
    tone === "today"
      ? "hover:bg-emerald-50/60"
      : "hover:bg-rose-50/60";

  return (
    <div className="overflow-x-auto" dir="rtl">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="border-b border-border/70 text-muted-foreground">
            <th className="px-3 py-2 text-start font-medium">العميل</th>
            <th className="px-3 py-2 text-start font-medium">الشركة</th>
            <th className="px-3 py-2 text-start font-medium">متابعة تالية</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr
              key={r.id}
              className={cn("border-b border-border/40 transition-colors", rowClass)}
            >
              <td className="px-3 py-2">
                <Link
                  href={`/clients/${r.id}`}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {r.name}
                </Link>
              </td>
              <td className="max-w-[14rem] truncate px-3 py-2 text-muted-foreground">
                {r.company?.trim() || "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                {formatNextFollowUpLabel(r.nextFollowUpAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rest > 0 ? (
        <p className="border-t border-border/50 px-3 py-3 text-center text-xs text-muted-foreground">
          و{rest} عميل آخر — افتح «صفحة كاملة» للجدول التفاعلي والفلاتر.
        </p>
      ) : null}
    </div>
  );
}
