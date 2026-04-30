import Link from "next/link";

import { AddClientForm } from "@/components/clients/add-client-form";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listClientClassifications } from "@/lib/data/classifications";
import { getActiveCustomFieldDefinitions } from "@/lib/data/custom-fields";
import { clientsImportTemplateHref } from "@/lib/export-excel-href";
import { getCoreFieldLabels, labelMap } from "@/lib/data/core-field-labels";
import { defaultAddClientValues } from "@/lib/validations/add-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "إضافة عميل",
  description: "نموذج إدخال عميل جديد",
};

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{
    newLeadId?: string;
    phone?: string;
    date?: string;
    ad?: string;
  }>;
}) {
  const sp = await searchParams;
  const linkedNewLeadId = sp.newLeadId?.trim() || undefined;
  const phone = sp.phone?.trim() || undefined;
  const date =
    sp.date?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(sp.date.trim())
      ? sp.date.trim()
      : undefined;
  const ad = sp.ad?.trim() || undefined;

  const [definitions, labels, classifications] = await Promise.all([
    getActiveCustomFieldDefinitions(),
    getCoreFieldLabels(),
    listClientClassifications(),
  ]);
  const coreLabels = labelMap(labels);

  const base = defaultAddClientValues(definitions);
  const initialValues: Record<string, unknown> = {
    ...base,
    ...(phone ? { phone } : {}),
    ...(date ? { documentDate: date, initialCallDate: date } : {}),
    ...(ad ? { sourceAdName: ad } : {}),
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <PageHeader
        fullWidthBar
        title="إضافة عميل جديد"
        subtitle="إدخال بيانات عميل جديد مع الحقول الأساسية والمخصصة."
      />
      {linkedNewLeadId ? (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
          يتم ربط هذا الحفظ بتقرير الليدات؛ بعد نجاح الإنشاء تُحدَّث حالة الليد إلى «تم الوصول».
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <a href={clientsImportTemplateHref()} className="text-primary underline-offset-4 hover:underline">
            قالب استيراد Excel
          </a>
          {" · "}
          <Link href="/clients/import" className="text-primary underline-offset-4 hover:underline">
            استيراد دفعة
          </Link>
        </p>
        <Link
          href="/clients"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex h-8 items-center justify-center px-2.5 text-sm"
          )}
        >
          قائمة العملاء
        </Link>
      </div>
      <AddClientForm
        fieldDefinitions={definitions}
        classifications={classifications}
        coreLabels={coreLabels}
        initialValues={initialValues}
        linkedNewLeadId={linkedNewLeadId}
      />
    </div>
  );
}
