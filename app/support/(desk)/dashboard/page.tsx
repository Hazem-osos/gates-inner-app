import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireSupportSessionUser } from "@/lib/helpdesk/auth-helpers";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SupportDashboardPage() {
  const user = await requireSupportSessionUser();
  const openCount = await prisma.ticket.count({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
  });
  const closedToday = await prisma.ticket.count({
    where: {
      status: "CLOSED",
      updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">لوحة الدعم الفني</h1>
      <p className="text-muted-foreground">
        مرحباً {user.name}
        {user.supportRole === "ADMIN" ? " (مدير)" : " (وكيل)"}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">تذاكر نشطة</p>
          <p className="text-3xl font-bold tabular-nums">{openCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">أُغلقت اليوم</p>
          <p className="text-3xl font-bold tabular-nums">{closedToday}</p>
        </div>
      </div>
      <Link href="/support/tickets" className={cn(buttonVariants())}>
        عرض التذاكر
      </Link>
    </div>
  );
}
