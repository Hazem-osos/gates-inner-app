import Link from "next/link";

import { ExcelImportForm } from "@/components/clients/excel-import-form";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireSessionUser } from "@/lib/auth-helpers";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientsImportPage() {
  await requireSessionUser();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="استيراد عملاء من Excel"
        subtitle="رفع ملف يطابق القالب — صف واحد لكل عميل."
      />

      <div className="flex justify-end">
        <Link
          href="/clients"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          العودة لقائمة العملاء
        </Link>
      </div>

      <ExcelImportForm />
    </div>
  );
}
