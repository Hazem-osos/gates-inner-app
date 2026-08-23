import { endOfDay } from "date-fns";

import type { Customer } from "@prisma/client";

export type TicketCreateEligibility =
  | { ok: true; courtesy: boolean }
  | { ok: false; reason: "expired_locked" | "inactive" };

export function evaluateTicketCreation(
  customer: Pick<
    Customer,
    "isActive" | "licenseEndDate" | "hasUsedCourtesyTicket"
  >,
  now = new Date()
): TicketCreateEligibility {
  if (!customer.isActive) return { ok: false, reason: "inactive" };
  const licenseEnd = endOfDay(new Date(customer.licenseEndDate));
  if (now <= licenseEnd) return { ok: true, courtesy: false };
  if (!customer.hasUsedCourtesyTicket) return { ok: true, courtesy: true };
  return { ok: false, reason: "expired_locked" };
}

export function licenseStatusMessage(
  customer: Pick<
    Customer,
    "licenseEndDate" | "hasUsedCourtesyTicket"
  >,
  now = new Date()
): string | null {
  const licenseEnd = endOfDay(new Date(customer.licenseEndDate));
  if (now <= licenseEnd) return null;
  if (!customer.hasUsedCourtesyTicket) {
    return "انتهت رخصة الدعم الفني. يمكنك فتح تذكرة واحدة أخيرة (مجاملة) فقط.";
  }
  return "انتهت رخصة الدعم الفني وتم استخدام تذكرة المجاملة. تواصل مع الإدارة للتجديد.";
}
