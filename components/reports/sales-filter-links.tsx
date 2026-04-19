import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

function buildHref(
  pathname: string,
  base: Record<string, string | undefined>,
  sales: string
) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v !== undefined && v !== "") u.set(k, v);
  }
  if (sales && sales !== "all") u.set("sales", sales);
  const q = u.toString();
  return q ? `${pathname}?${q}` : pathname;
}

export async function SalesFilterLinks(props: {
  role: UserRole;
  pathname: string;
  /** معاملات URL الحالية (مرّرها من الصفحة) */
  searchParams: Record<string, string | undefined>;
  currentSales?: string;
}) {
  if (props.role === "SALES") return null;

  const salesUsers = await prisma.user.findMany({
    where: { isActive: true, role: "SALES" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const active =
    props.currentSales && props.currentSales !== "all"
      ? props.currentSales
      : "all";
  const sp = { ...props.searchParams };
  delete sp.sales;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
      <span className="font-medium text-muted-foreground">فلتر السيلز:</span>
      <Link
        href={buildHref(props.pathname, sp, "all")}
        className={cn(
          buttonVariants({
            variant: active === "all" ? "default" : "outline",
            size: "sm",
          })
        )}
      >
        كل السيلز
      </Link>
      {salesUsers.map((s) => (
        <Link
          key={s.id}
          href={buildHref(props.pathname, sp, s.id)}
          className={cn(
            buttonVariants({
              variant: active === s.id ? "default" : "outline",
              size: "sm",
            })
          )}
        >
          {s.name}
        </Link>
      ))}
    </div>
  );
}
