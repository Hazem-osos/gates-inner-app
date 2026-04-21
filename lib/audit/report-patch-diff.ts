import type { Client } from "@prisma/client";
import { Prisma } from "@prisma/client";

import type { ReportClientPatchInput } from "@/app/actions/report-client-patch";

type FollowSlot = { order: number; note: string; date: string };

export function normalizeFollowSlots(raw: unknown): FollowSlot[] {
  if (!Array.isArray(raw)) return [];
  const out: FollowSlot[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as Record<string, unknown>;
    if (typeof item !== "object" || item === null) continue;
    out.push({
      order: typeof item.order === "number" ? item.order : i + 1,
      note: typeof item.note === "string" ? item.note : "",
      date: typeof item.date === "string" ? item.date : "",
    });
  }
  return out.sort((a, b) => a.order - b.order);
}

function trimEq(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "").trim() === (b ?? "").trim();
}

function iso(d: Date | null | undefined): string {
  return d ? d.toISOString() : "";
}

function dateOnlyFromIso(s: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10) || s;
  return d.toISOString().slice(0, 10);
}

function quoteStr(v: Prisma.Decimal | null | undefined): string {
  if (v == null) return "";
  return v.toString();
}

/** سطور عربية قصيرة — بدون نص التوصية أو الحقول الطويلة */
export function buildArabicAuditLinesFromPatch(
  client: Client,
  patch: ReportClientPatchInput
): string[] {
  const lines: string[] = [];

  if (patch.name !== undefined && !trimEq(patch.name, client.name)) {
    lines.push("تعديل اسم العميل");
  }
  if (patch.phone !== undefined && !trimEq(patch.phone, client.phone)) {
    lines.push("تعديل رقم الهاتف");
  }
  if (patch.phone2 !== undefined && !trimEq(patch.phone2, client.phone2)) {
    lines.push("تعديل هاتف ثانٍ");
  }
  if (patch.company !== undefined && !trimEq(patch.company, client.company)) {
    lines.push("تعديل اسم الشركة");
  }
  if (patch.position !== undefined && !trimEq(patch.position, client.position)) {
    lines.push("تعديل المسمى الوظيفي");
  }
  if (patch.address !== undefined && !trimEq(patch.address, client.address)) {
    lines.push("تعديل العنوان");
  }
  if (patch.activity !== undefined && !trimEq(patch.activity, client.activity)) {
    lines.push("تعديل النشاط");
  }
  if (patch.quotePrice !== undefined) {
    const next = (patch.quotePrice ?? "").trim();
    const prev = quoteStr(client.quotePrice);
    if (next !== prev) lines.push("تعديل عرض السعر");
  }
  if (patch.quoteDetail !== undefined && !trimEq(patch.quoteDetail, client.quoteDetail)) {
    lines.push("تعديل تفصيل عرض السعر");
  }
  if (patch.callSummary !== undefined && !trimEq(patch.callSummary, client.callSummary)) {
    lines.push("تعديل ملخص المكالمة");
  }
  if (
    patch.currentSituation !== undefined &&
    !trimEq(patch.currentSituation, client.currentSituation)
  ) {
    lines.push("تعديل الموقف الحالي");
  }
  if (patch.salesNotes !== undefined && !trimEq(patch.salesNotes, client.salesNotes)) {
    lines.push("تعديل ملاحظات السيلز");
  }
  if (
    patch.finalStatusNote !== undefined &&
    !trimEq(patch.finalStatusNote, client.finalStatusNote)
  ) {
    lines.push("تعديل الموقف النهائي");
  }
  if (
    patch.clientWarmingText !== undefined &&
    !trimEq(patch.clientWarmingText, client.clientWarmingText)
  ) {
    lines.push("تعديل أدوات Warming");
  }
  if (
    patch.presentingEmployeeName !== undefined &&
    !trimEq(patch.presentingEmployeeName, client.presentingEmployeeName)
  ) {
    lines.push("تعديل عمود موظف العرض");
  }
  if (patch.sourceAdName !== undefined && !trimEq(patch.sourceAdName, client.sourceAdName)) {
    lines.push("تعديل اسم الإعلان");
  }
  if (patch.adPlatform !== undefined && !trimEq(patch.adPlatform, client.adPlatform)) {
    lines.push("تعديل المنصة الإعلانية");
  }

  if (
    patch.managementRecommendationText !== undefined &&
    !trimEq(
      patch.managementRecommendationText,
      client.managementRecommendationText
    )
  ) {
    lines.push("كتابة أو تعديل حقل توصية الإدارة (بدون عرض نص التوصية)");
  }
  if (patch.managementRecommendationDate !== undefined) {
    const prev = iso(client.managementRecommendationDate);
    const raw = patch.managementRecommendationDate?.trim();
    const next = raw && raw !== "" ? new Date(raw).toISOString() : "";
    if (prev !== next) {
      const d = raw && raw !== "" ? dateOnlyFromIso(raw) : "—";
      lines.push(`تعديل تاريخ توصية الإدارة (${d})`);
    }
  }

  if (patch.nextFollowUpAt !== undefined) {
    const prev = iso(client.nextFollowUpAt);
    const next = patch.nextFollowUpAt.trim()
      ? new Date(patch.nextFollowUpAt).toISOString()
      : "";
    if (prev !== next) {
      lines.push(
        `تعديل تاريخ المتابعة التالي إلى ${dateOnlyFromIso(patch.nextFollowUpAt)}`
      );
    }
  }

  if (
    patch.visitAppointmentScheduled !== undefined &&
    patch.visitAppointmentScheduled !== client.visitAppointmentScheduled
  ) {
    lines.push(
      patch.visitAppointmentScheduled
        ? "تفعيل: تم تحديد موعد زيارة"
        : "إلغاء تحديد موعد الزيارة"
    );
  }
  if (patch.visitAppointmentDate !== undefined) {
    const prev = iso(client.visitAppointmentDate);
    const p = patch.visitAppointmentDate?.trim();
    const next = p ? new Date(p).toISOString() : "";
    if (prev !== next) {
      const label = p ? dateOnlyFromIso(p) : "إفراغ";
      lines.push(`تعديل تاريخ الزيارة (${label})`);
    }
  }

  if (patch.qqAnswer !== undefined && patch.qqAnswer !== client.qqAnswer) {
    lines.push(
      patch.qqAnswer === true
        ? "تعديل QQ إلى نعم"
        : patch.qqAnswer === false
          ? "تعديل QQ إلى لا"
          : "تعديل QQ"
    );
  }

  if (patch.classificationId !== undefined) {
    const prev = client.classificationId ?? "";
    const next = patch.classificationId ?? "";
    if (prev !== next) lines.push("تعديل تصنيف العميل");
  }

  if (patch.initialCallDate !== undefined) {
    const prev = iso(client.initialCallDate);
    const raw = patch.initialCallDate?.trim();
    const next = raw && raw !== "" ? new Date(raw).toISOString() : "";
    if (prev !== next) {
      lines.push("تعديل تاريخ الاتصال الأول");
    }
  }
  if (patch.lossReason !== undefined && !trimEq(patch.lossReason, client.lossReason)) {
    lines.push("تعديل سبب الإغلاق");
  }
  if (patch.closedLostAt !== undefined) {
    const prev = iso(client.closedLostAt);
    const raw = patch.closedLostAt?.trim();
    const next = raw && raw !== "" ? new Date(raw).toISOString() : "";
    if (prev !== next) {
      lines.push("تعديل تاريخ الإغلاق");
    }
  }

  if (patch.followUpSlots !== undefined) {
    const before = normalizeFollowSlots(client.followUpSlots);
    const after = normalizeFollowSlots(patch.followUpSlots);
    const beforeBy = new Map(before.map((s) => [s.order, s]));
    const afterBy = new Map(after.map((s) => [s.order, s]));

    for (const [order, a] of afterBy) {
      const b = beforeBy.get(order);
      const dateShort = (a.date || "").slice(0, 10) || "—";
      if (!b && (a.date.trim() || a.note.trim())) {
        lines.push(`إضافة متابعة رقم ${order} بتاريخ ${dateShort}`);
      } else if (b) {
        if (b.date !== a.date) {
          lines.push(`تعديل تاريخ متابعة رقم ${order} إلى ${dateShort}`);
        }
        if (b.note !== a.note) {
          lines.push(`تعديل ملاحظة متابعة رقم ${order}`);
        }
      }
    }
    for (const [order] of beforeBy) {
      if (!afterBy.has(order)) {
        lines.push(`إزالة متابعة رقم ${order} من السجل`);
      }
    }
  }

  return lines;
}
