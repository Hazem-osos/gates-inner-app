import {
  cellStr,
  parseDiscount,
  parseExcelDateCell,
  parseFirstQuotedPriceString,
  parsePhones,
  type ParsedImportRow,
  type ParseRowResult,
} from "@/lib/import/excel-client-import";

function parseYesCellFlat(raw: unknown): boolean | null {
  const s = cellStr(raw).toLowerCase();
  if (!s) return null;
  if (/^(نعم|اه|ايه|yes|true|1|y|تم)$/.test(s)) return true;
  if (/^(لا|no|false|0)$/.test(s)) return false;
  return null;
}

function nullIfEmpty(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t;
}

/**
 * يحوّل صفاً مسطّحاً (مفاتيح = أسماء الحقول بعد التعيين) إلى نفس شكل استيراد العملاء.
 * لا يبني `followUpSlots` من أعمدة ديناميكية — يقرأ JSON من الحقل `followUpSlots` إن وُجد.
 */
export function rowRecordToParsedImportRow(
  row: Record<string, unknown>,
  excelRow: number
): ParseRowResult {
  const phones = parsePhones(row.phone);
  if (!phones.phone || phones.phone.length < 8) {
    return { skip: true, reason: "لا رقم هاتف صالح", excelRow };
  }

  const name = cellStr(row.name);
  const contactName = cellStr(row.company);
  const finalName = name || contactName || `عميل ${phones.phone.slice(-4)}`;

  const disc = parseDiscount(row.allowedDiscount);
  const qNoteParts: string[] = [];
  if (disc.salesNoteAppend) qNoteParts.push(`خصم (نص): ${disc.salesNoteAppend}`);
  const baseNotes = cellStr(row.salesNotes);
  const mergedNotes = [baseNotes, ...qNoteParts].filter(Boolean).join("\n");
  const salesNotes = mergedNotes.trim() === "" ? null : mergedNotes;

  const visitSched = parseYesCellFlat(row.visitAppointmentScheduled);

  let followUpSlots: ParsedImportRow["followUpSlots"] = [];
  const slotsRaw = cellStr(row.followUpSlots);
  if (slotsRaw) {
    try {
      const p = JSON.parse(slotsRaw) as unknown;
      followUpSlots = Array.isArray(p) ? (p as ParsedImportRow["followUpSlots"]) : [];
    } catch {
      followUpSlots = [];
    }
  }

  return {
    excelRow,
    name: finalName,
    company: contactName || null,
    phone: phones.phone,
    phone2: phones.phone2,
    activity: nullIfEmpty(cellStr(row.activity)),
    position: nullIfEmpty(cellStr(row.position)),
    address: nullIfEmpty(cellStr(row.address)),
    quotePrice: parseFirstQuotedPriceString(row.quotePrice),
    allowedDiscount: disc.allowedDiscount,
    salesNotes,
    sourceAdName: nullIfEmpty(cellStr(row.sourceAdName)),
    adPlatform: nullIfEmpty(cellStr(row.adPlatform)),
    visitAppointmentScheduled: visitSched === true,
    visitAppointmentDate: parseExcelDateCell(row.visitAppointmentDate),
    presentingEmployeeName: nullIfEmpty(cellStr(row.presentingEmployeeName)),
    lossReason: nullIfEmpty(cellStr(row.lossReason)),
    qqAnswer: parseYesCellFlat(row.qqAnswer),
    currentSituation: nullIfEmpty(cellStr(row.currentSituation)),
    callSummary: nullIfEmpty(cellStr(row.callSummary)),
    managementRecommendationText: nullIfEmpty(
      cellStr(row.managementRecommendationText)
    ),
    managementRecommendationDate: parseExcelDateCell(
      row.managementRecommendationDate
    ),
    clientWarmingText: nullIfEmpty(cellStr(row.clientWarmingText)),
    initialCallDate: parseExcelDateCell(row.initialCallDate),
    nextFollowUpAt: parseExcelDateCell(row.nextFollowUpAt),
    followUpSlots,
    clientTypeRaw: nullIfEmpty(cellStr(row.clientType)),
    daysRaw: nullIfEmpty(cellStr(row.daysCount)),
  };
}
