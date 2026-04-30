import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import type { ClientsListQuery } from "@/lib/data/clients-list";
import { cn } from "@/lib/utils";

type ClassificationOpt = { id: string; label: string };

export function ClientsListFiltersForm({
  salesKey,
  listQuery,
  classifications,
}: {
  salesKey: string;
  listQuery: ClientsListQuery;
  classifications: ClassificationOpt[];
}) {
  const qRaw = listQuery.q?.trim() ?? "";
  const notClosed = Boolean(listQuery.notClosed);
  const closedLost = Boolean(listQuery.closedLost);
  const won = Boolean(listQuery.won);
  const notWon = Boolean(listQuery.notWon);
  const cls = listQuery.classificationKey?.trim() ?? "all";

  const hasAnyFilter =
    qRaw.length > 0 ||
    notClosed ||
    closedLost ||
    won ||
    notWon ||
    (cls !== "all" && cls !== "");

  return (
    <form
      method="get"
      className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4 dark:bg-muted/5"
    >
      {salesKey !== "all" ? (
        <input type="hidden" name="sales" value={salesKey} />
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <label
            htmlFor="clients-q"
            className="text-xs font-medium text-muted-foreground"
          >
            بحث (اسم، شركة، هاتف)
          </label>
          <input
            id="clients-q"
            name="q"
            type="search"
            defaultValue={qRaw}
            placeholder="اسم العميل، الشركة، أو الهاتف"
            dir="rtl"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" className="h-9 w-full shrink-0 sm:w-auto">
          تطبيق الفلتر
        </Button>
        {hasAnyFilter ? (
          <Link
            href={
              salesKey !== "all"
                ? `/clients?sales=${encodeURIComponent(salesKey)}`
                : "/clients"
            }
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-9 w-full shrink-0 justify-center sm:w-auto"
            )}
          >
            مسح الفلاتر
          </Link>
        ) : null}
      </div>

      <fieldset className="space-y-3 border-0 p-0">
        <legend className="mb-1 text-xs font-semibold text-foreground">
          فلترة الحالة والتصنيف
        </legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="f_nc"
              value="1"
              defaultChecked={notClosed}
              className="size-4 rounded border-input"
            />
            غير مغلق
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="f_cl"
              value="1"
              defaultChecked={closedLost}
              className="size-4 rounded border-input"
            />
            تم الإغلاق
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="f_won"
              value="1"
              defaultChecked={won}
              className="size-4 rounded border-input"
            />
            تم البيع
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="f_nw"
              value="1"
              defaultChecked={notWon}
              className="size-4 rounded border-input"
            />
            لم يتم البيع
            <span className="text-xs text-muted-foreground">
              (استبعاد من باعوا)
            </span>
          </label>
        </div>

        <div className="max-w-md space-y-1 pt-1">
          <label htmlFor="clients-cls" className="text-xs font-medium text-muted-foreground">
            التصنيف
          </label>
          <select
            id="clients-cls"
            name="cls"
            defaultValue={cls === "" ? "all" : cls}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">الكل</option>
            <option value="none">بدون تصنيف</option>
            {classifications.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.label}
              </option>
            ))}
          </select>
        </div>
      </fieldset>
    </form>
  );
}
