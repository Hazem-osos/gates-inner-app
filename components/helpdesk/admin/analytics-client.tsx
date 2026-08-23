"use client";

import { useEffect, useState } from "react";

export function AdminAnalyticsClient() {
  const [data, setData] = useState<{
    overallAvg: number;
    totalReviews: number;
    agentStats: { agentName: string; avgRating: number; count: number }[];
  } | null>(null);

  useEffect(() => {
    void fetch("/api/support/analytics/csat")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">جاري التحميل…</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">متوسط التقييم العام</p>
        <p className="text-3xl font-bold">{data.overallAvg || "—"}</p>
        <p className="text-xs text-muted-foreground">
          من {data.totalReviews} تقييم
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-right">
            <th className="p-2">الوكيل</th>
            <th className="p-2">المتوسط</th>
            <th className="p-2">العدد</th>
          </tr>
        </thead>
        <tbody>
          {data.agentStats.map((a, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">{a.agentName}</td>
              <td className="p-2 tabular-nums">{a.avgRating}</td>
              <td className="p-2 tabular-nums">{a.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
