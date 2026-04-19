import type { Client, CustomFieldDefinition } from "@prisma/client";
import { ClientStatus, CustomFieldValueType } from "@prisma/client";

import type { ClassificationRow } from "@/lib/data/classifications";

function fmtLocal(d: Date | null | undefined): string {
  if (!d) return "";
  const x = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

function fmtDateOnly(d: Date | null | undefined): string {
  if (!d) return "";
  const x = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

function decToStr(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

export function clientToFormValues(
  client: Client,
  defs: CustomFieldDefinition[],
  classifications: ClassificationRow[]
): Record<string, unknown> {
  const cfJson =
    typeof client.customFields === "object" &&
    client.customFields !== null &&
    !Array.isArray(client.customFields)
      ? (client.customFields as Record<string, unknown>)
      : {};

  const custom: Record<string, unknown> = {};
  for (const d of defs) {
    const k = `cf_${d.key}`;
    const v = cfJson[d.key];
    if (d.valueType === CustomFieldValueType.BOOLEAN) {
      custom[k] = Boolean(v);
    } else {
      custom[k] = v === undefined || v === null ? "" : String(v);
    }
  }

  const qq =
    client.qqAnswer === true ? "yes" : client.qqAnswer === false ? "no" : undefined;

  let pipelineChoice = "";
  if (client.status === ClientStatus.WON) {
    pipelineChoice = "won";
  } else if (client.status === ClientStatus.LOST) {
    pipelineChoice = "lost";
  } else if (client.classificationId) {
    pipelineChoice = `cls:${client.classificationId}`;
  } else {
    const bRow = classifications.find((c) => c.isBRow);
    const nonB = classifications.filter((c) => !c.isBRow);
    if (client.status === ClientStatus.B && bRow) {
      pipelineChoice = `cls:${bRow.id}`;
    } else if (client.status === ClientStatus.NOT_B && nonB.length > 0) {
      const raw = (client.notBClassification ?? "").trim();
      const byId = nonB.find((c) => c.id === raw);
      const byLabel = nonB.find((c) => c.label === raw);
      const guess = byId ?? byLabel ?? nonB[0];
      pipelineChoice = `cls:${guess.id}`;
    } else if (bRow) {
      pipelineChoice = `cls:${bRow.id}`;
    }
  }

  let classificationSubId = "";
  if (
    client.classificationId &&
    classifications.find((c) => c.id === client.classificationId)?.isBRow ===
      false
  ) {
    const raw = (client.notBClassification ?? "").trim();
    if (raw) {
      const byId = classifications.find((c) => c.id === raw && !c.isBRow);
      const byLabel = classifications.find((c) => c.label === raw && !c.isBRow);
      classificationSubId = (byId ?? byLabel)?.id ?? raw;
    }
  } else if (client.status === ClientStatus.NOT_B && !client.classificationId) {
    const raw = (client.notBClassification ?? "").trim();
    const nonB = classifications.filter((c) => !c.isBRow);
    const byId = nonB.find((c) => c.id === raw);
    const byLabel = nonB.find((c) => c.label === raw);
    classificationSubId = (byId ?? byLabel)?.id ?? "";
  }

  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const docDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  return {
    documentDate: docDate,
    visitAppointmentScheduled: client.visitAppointmentScheduled ?? false,
    visitAppointmentDate: fmtDateOnly(client.visitAppointmentDate ?? undefined),
    name: client.name,
    phone: client.phone,
    phone2: client.phone2 ?? "",
    company: client.company ?? "",
    position: client.position ?? "",
    address: client.address ?? "",
    quotePrice: decToStr(client.quotePrice),
    quoteDetail: client.quoteDetail ?? "",
    allowedDiscount: decToStr(client.allowedDiscount),
    pipelineChoice,
    classificationSubId,
    sourceAdName: client.sourceAdName ?? "",
    adPlatform: client.adPlatform ?? "",
    qqAnswer: qq,
    callSummary: client.callSummary ?? "",
    salesNotes: client.salesNotes ?? "",
    clientWarmingText: client.clientWarmingText ?? "",
    presentingEmployeeName: client.presentingEmployeeName ?? "",
    initialCallDate: client.initialCallDate
      ? fmtDateOnly(client.initialCallDate)
      : "",
    nextFollowUpAt: client.nextFollowUpAt ? fmtLocal(client.nextFollowUpAt) : "",
    contractValue: decToStr(client.contractValue),
    saleDate: fmtLocal(client.saleDate),
    lossReason: client.lossReason ?? "",
    closedLostAt: fmtLocal(client.closedLostAt),
    ...custom,
  };
}

export function statusLabelAr(s: ClientStatus): string {
  switch (s) {
    case ClientStatus.B:
      return "عميل B";
    case ClientStatus.NOT_B:
      return "عميل Not B";
    case ClientStatus.WON:
      return "تم البيع";
    case ClientStatus.LOST:
      return "تم الإغلاق";
    default:
      return s;
  }
}
