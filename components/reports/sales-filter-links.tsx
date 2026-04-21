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
  /** بدون إطار البطاقة الملتصّق — لدمجها مع أزرار التصدير في صف واحد */
  bare?: boolean;
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

  const inner = (
    <>
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
    </>
  );

  if (props.bare) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2">{inner}</div>
    );
  }

  return (
    <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/95 px-3 py-2 text-sm shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-muted/90">
      {inner}
    </div>
  );
}
