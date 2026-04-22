import Link from "next/link";
import { notFound } from "next/navigation";

import { AddClientForm } from "@/components/clients/add-client-form";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { ClientPipelinePanel } from "@/components/clients/client-pipeline-panel";
import { ClientWarmingForm } from "@/components/clients/client-warming-form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { clientToFormValues, statusLabelAr } from "@/lib/clients-form-values";
import { getClientDetail } from "@/lib/data/client-detail";
import { listClientClassifications } from "@/lib/data/classifications";
import { getActiveCustomFieldDefinitions } from "@/lib/data/custom-fields";
import { getCoreFieldLabels, labelMap } from "@/lib/data/core-field-labels";
import { isManagerOrAdmin, requireSessionUser } from "@/lib/auth-helpers";
import { formatDateTimeArabic } from "@/lib/date-arabic";
import { userDisplayName } from "@/lib/user-display-name";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSessionUser();
  const client = await getClientDetail(id);
  if (!client) notFound();

  if (
    user.role === "SALES" &&
    client.assignedUserId &&
    client.assignedUserId !== user.id
  ) {
    notFound();
  }

  const [defs, labels, classifications] = await Promise.all([
    getActiveCustomFieldDefinitions(),
    getCoreFieldLabels(),
    listClientClassifications(),
  ]);
  const coreLabels = labelMap(labels);
  const initialValues = clientToFormValues(client, defs, classifications);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{client.name}</h1>
            <Badge>{statusLabelAr(client.status)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {client.company ?? "—"} · <span dir="ltr">{client.phone}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {isManagerOrAdmin(user.role) ? (
            <DeleteClientButton
              clientId={client.id}
              clientName={client.name}
            />
          ) : null}
          <Link
            href="/clients"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            ← العملاء
          </Link>
        </div>
      </div>

      <AddClientForm
        key={client.id}
        clientId={client.id}
        fieldDefinitions={defs}
        classifications={classifications}
        initialValues={initialValues}
        coreLabels={coreLabels}
      />

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">أدوات Warming</h2>
        <ClientWarmingForm clientId={client.id} />
        <ul className="space-y-2 text-sm">
          {client.warmingTools.map((w) => (
            <li key={w.id} className="rounded border border-border/50 p-2">
              <p className="text-muted-foreground" dir="ltr">
                {w.communicatedAt
                  ? formatDateTimeArabic(w.communicatedAt)
                  : "—"}
              </p>
              <p className="text-xs" dir="rtl">
                {w.day1Content?.slice(0, 80)}
                {w.day1Content && w.day1Content.length > 80 ? "…" : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <ClientPipelinePanel clientId={client.id} currentStatus={client.status} />

      <Separator />

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">سجل تغيير الحالة</h2>
        <ul className="space-y-1">
          {client.statusHistory.map((h) => (
            <li key={h.id}>
              {h.fromStatus ? statusLabelAr(h.fromStatus) : "—"} ←{" "}
              {statusLabelAr(h.toStatus)} —{" "}
              {formatDateTimeArabic(h.createdAt)}
              {h.changedBy
                ? ` (${userDisplayName(h.changedBy)})`
                : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
