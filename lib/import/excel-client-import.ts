import * as XLSX from "xlsx";

export type ImportType = "b" | "not-b";

/** حدود سنة مقبولة لـ MySQL / Prisma DateTime */
const MIN_DB_YEAR = 1900;
const MAX_DB_YEAR = 2100;

export function excelDateToJS(serial: number): Date {
  return new Date((serial - 25569) * 86400 * 1000);
}

/** يُرجع التاريخ فقط إن كان ضمن نطاق معقول — يمنع أخطاء مثل سنة 20206 من parsing خاطئ */
export function toSafeDbDate(d: Date | null | undefined): Date | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < MIN_DB_YEAR || y > MAX_DB_YEAR) return null;
  return d;
}

/**
 * تسلسل Excel للتاريخ (يوميات من ~1905 حتى ~2268).
 * ما بعد التحقق يُمرَّر على toSafeDbDate لرفض السنوات خارج 1900–2100.
 */
function isLikelyExcelDateSerial(n: number): boolean {
  return Number.isFinite(n) && n >= 2_000 && n <= 500_000;
}

function normalizeArabicHeader(s: string): string {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

/** أرقام عربية شرقية (٠–٩) → ASCII — شائع في Excel العربي */
function toAsciiDigitsFromArabicIndic(s: string): string {
  const indic = "٠١٢٣٤٥٦٧٨٩";
  let o = "";
  for (const ch of s) {
    const i = indic.indexOf(ch);
    o += i >= 0 ? String(i) : ch;
  }
  return o;
}

export function cellStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function parseNumericPrefixFromSlash(raw: unknown): number | null {
  const s = cellStr(raw);
  if (!s) return null;
  const head = s.split(/[/／]/)[0]?.trim() ?? s;
  const n = Number(head.replace(/,/g, "").replace(/^[^\d.-]+/, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * تحليل صريح ليوم/شهر/سنة (إنجليزي، سلوك شائع في مصر والمنطقة).
 * يتجنّب Date.parse الذي يفسّر "١/٢/٢٠٢٥" و"1/2/2025" كـ شهر/يوم (أمريكي).
 * يُفضّل ISO 8601 (سنة-شهر-يوم) لـ Date.parse كما هي.
 */
function parseDayMonthYearString(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const t = Date.parse(trimmed);
    return Number.isNaN(t) ? null : new Date(t);
  }

  const m =
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/.exec(
      trimmed
    );
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += year > 69 ? 1900 : 2000;

  const h = m[4] !== undefined ? Number(m[4]) : 0;
  const min = m[5] !== undefined ? Number(m[5]) : 0;
  const sec = m[6] !== undefined ? Number(m[6]) : 0;

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    h > 23 ||
    min > 59 ||
    sec > 59
  ) {
    return null;
  }

  const ms = Date.UTC(year, month - 1, day, h, min, sec);
  const d = new Date(ms);
  if (
    d.getUTCDate() !== day ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCFullYear() !== year
  ) {
    return null;
  }
  return d;
}

export function parseExcelDateCell(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return toSafeDbDate(v);
  }
  if (typeof v === "number") {
    if (isLikelyExcelDateSerial(v)) {
      return toSafeDbDate(excelDateToJS(v));
    }
    if (v > 1e11) return toSafeDbDate(new Date(v));
  }
  const s = cellStr(v);
  if (!s) return null;
  const prefixNum = parseNumericPrefixFromSlash(s);
  if (prefixNum !== null && isLikelyExcelDateSerial(prefixNum)) {
    return toSafeDbDate(excelDateToJS(prefixNum));
  }
  const dmy = parseDayMonthYearString(s);
  if (dmy) return toSafeDbDate(dmy);
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return toSafeDbDate(new Date(t));
}

/** أول سعر رقمي قبل / أو أول مجموعة أرقام */
export function parseFirstQuotedPriceString(raw: unknown): string | null {
  const s = cellStr(raw);
  if (!s) return null;
  const part = s.split(/[/／]/)[0]?.trim() ?? s;
  const cleaned = (part.split(/\s+/)[0] ?? "").replace(/,/g, "");
  const m = cleaned.match(/-?\d+(\.\d+)?/);
  return m ? m[0] : null;
}

export function parsePhones(raw: unknown): { phone: string; phone2: string | null } {
  const s = toAsciiDigitsFromArabicIndic(cellStr(raw));
  if (!s) return { phone: "", phone2: null };
  const parts = s
    .split(/[/／]/)
    .map((p) => p.trim())
    .filter(Boolean);

  function digitize(p: string) {
    const t = p.trim();
    /** Excel يعرض أحياناً أرقاماً ككسر: "1012345678.0" فيصبح بعد إزالة غير الأرقام ١١ خانة خاطئ */
    if (/^\d+\.\d+$/.test(t)) {
      const n = Number(t.replace(/,/g, ""));
      if (Number.isFinite(n) && n >= 1e6 && n < 1e13) {
        return String(Math.round(n)).replace(/[^\d]/g, "");
      }
    }
    return t.replace(/[^\d]/g, "");
  }

  function normalizeEgypt(digits: string): string {
    let d = digits;
    if (!d) return "";
    if (d.startsWith("20") && d.length >= 12) d = d.slice(-10);
    if (d.length >= 9 && d.startsWith("1") && !d.startsWith("01")) d = `0${d}`;
    return d;
  }

  const p1 = normalizeEgypt(digitize(parts[0] ?? ""));
  const p2 = parts[1] ? normalizeEgypt(digitize(parts[1])) : "";
  return { phone: p1, phone2: p2 || null };
}

/**
 * Normalizes a phone from Excel / JSON before Prisma `findFirst` / updates.
 * Bulletproof path for Egyptian mobiles: strips non-digits, normalizes +20 / 0020 / 00201 / Excel-dropped leading 0.
 *
 * @returns Strict **11-digit** local mobile (`01xxxxxxxxx`), or `null` if not a valid Egyptian mobile shape.
 */
export function normalizeExcelPhone(rawPhone: unknown): string | null {
  if (rawPhone === null || rawPhone === undefined) return null;

  let digits: string;

  if (typeof rawPhone === "number" && Number.isFinite(rawPhone)) {
    const n = rawPhone;
    const rounded =
      n % 1 !== 0 && Math.abs(n) >= 1e6 && Math.abs(n) < 1e13
        ? Math.round(n)
        : Math.trunc(n);
    digits = String(rounded).replace(/\D/g, "");
  } else {
    const trimmed = toAsciiDigitsFromArabicIndic(String(rawPhone).trim());
    const t = trimmed.trim();
    if (/^\d+\.\d+$/.test(t)) {
      const n = Number(t.replace(/,/g, ""));
      if (Number.isFinite(n) && n >= 1e6 && n < 1e13) {
        digits = String(Math.round(n)).replace(/\D/g, "");
      } else {
        digits = t.replace(/\D/g, "");
      }
    } else {
      digits = trimmed.replace(/\D/g, "");
    }
  }

  if (!digits) return null;

  if (digits.startsWith("00201")) {
    digits = "01" + digits.slice(5);
  }

  if (digits.startsWith("201") && digits.length >= 12) {
    digits = "01" + digits.slice(3);
  }

  if (digits.length === 10 && /^1[0125]\d{8}$/.test(digits)) {
    digits = `0${digits}`;
  }

  if (digits.length > 11) {
    const tail = digits.slice(-11);
    if (/^01\d{9}$/.test(tail)) digits = tail;
  }

  if (digits.length === 11 && /^01\d{9}$/.test(digits)) {
    return digits;
  }

  return null;
}

export function parseDiscount(raw: unknown): {
  allowedDiscount: string | null;
  salesNoteAppend: string | null;
} {
  const s = cellStr(raw);
  if (!s) return { allowedDiscount: null, salesNoteAppend: null };
  const compact = s.replace(/\s/g, "");
  if (/^[\d.,%]+$/.test(compact)) {
    const num = Number(s.replace(/,/g, "").replace("%", ""));
    if (!Number.isNaN(num)) {
      let pct = num;
      if (pct > 0 && pct <= 1) pct = num * 100;
      if (pct >= 0 && pct <= 100) {
        return { allowedDiscount: pct.toFixed(2), salesNoteAppend: null };
      }
    }
  }
  return { allowedDiscount: null, salesNoteAppend: s };
}

function parseYesCell(raw: unknown): boolean | null {
  const s = cellStr(raw).toLowerCase();
  if (!s) return null;
  if (/^(نعم|اه|ايه|yes|true|1|y)$/.test(s) || s === "تم") return true;
  if (/^(لا|no|false|0)$/.test(s)) return false;
  return null;
}

export function isFollowDateHeader(h: string): boolean {
  const n = normalizeArabicHeader(h);
  return n.includes("تاريخ") && n.includes("متابع");
}

export function isFollowNoteHeader(h: string): boolean {
  const n = normalizeArabicHeader(h);
  if (!n || n.includes("تاريخ")) return false;
  return n.includes("متابع");
}

export type ColumnMap = {
  contactCol: number;
  nextFollowCol: number | null;
  byField: Record<string, number | null>;
};

function findContactCol(headerRow: unknown[]): number | null {
  for (let j = 0; j < headerRow.length; j++) {
    const n = normalizeArabicHeader(String(headerRow[j] ?? ""));
    if (n.includes("تاريخ") && n.includes("اتصال")) return j;
  }
  return null;
}

function findCol(
  headerRow: unknown[],
  patterns: string[],
  used: Set<number>
): number | null {
  for (let j = 0; j < headerRow.length; j++) {
    if (used.has(j)) continue;
    const n = normalizeArabicHeader(String(headerRow[j] ?? ""));
    for (const p of patterns) {
      const pn = normalizeArabicHeader(p);
      if (n === pn || n.includes(pn) || pn.includes(n)) return j;
    }
  }
  return null;
}

export function buildColumnMap(headerRow: unknown[]): ColumnMap | null {
  const contactCol = findContactCol(headerRow);
  if (contactCol === null) return null;

  const used = new Set<number>([contactCol]);
  let nextFollowCol: number | null = null;
  for (let j = 0; j < contactCol; j++) {
    if (isFollowDateHeader(String(headerRow[j] ?? ""))) {
      nextFollowCol = j;
      used.add(j);
      break;
    }
  }

  const byField: Record<string, number | null> = {};
  const take = (key: string, patterns: string[]) => {
    const i = findCol(headerRow, patterns, used);
    if (i !== null) used.add(i);
    byField[key] = i;
  };

  take("clientWarmingText", [
    "تعليمات تنمية مهارات ai",
    "تعليمات تنمية مهارات",
  ]);
  take("managementRecommendationText", ["توصيات الاجتماع"]);
  take("name", ["اسم الشركه", "أسم الشركة", "اسم الشركة"]);
  take("daysCount", ["عدد الايام", "عدد الأيام"]);
  take("company", ["اسم المسئول", "أسم المسئول", "اسم المسؤول"]);
  take("phone", ["رقم التليفون", "رقم التلفون", "رقم الهاتف", "هاتف"]);
  take("activity", ["النشاط"]);
  take("position", ["البوزيشن", "الوظيفة"]);
  take("address", ["العنوان"]);
  take("quotePrice", ["عرض السعر"]);
  take("allowedDiscount", ["الخصم الممنوح", "الخصم"]);
  take("salesNotes", ["ملاحظات"]);
  take("sourceAdName", ["اسم الاعلان", "اسم الإعلان"]);
  take("adPlatform", ["قناة التسويق"]);
  take("visitAppointmentScheduled", ["تم ميتنج ولا لا", "تم ميتنج"]);
  take("clientType", ["نوعية العميل", "نوع العميل"]);
  take("presentingEmployeeName", ["موظف المبيعات"]);
  take("visitAppointmentDate", ["تاريخ الزياره", "تاريخ الزيارة"]);
  take("lossReason", ["سبب الاغلاق", "سبب الإغلاق"]);
  take("qqAnswer", ["ليه كيو كيو", "كيو كيو"]);
  take("currentSituation", ["الموقف الحالي", "الموقف"]);
  take("managementRecommendationDate", ["تاريخ اليوم"]);
  byField.initialCallDate = contactCol;

  return { contactCol, nextFollowCol, byField };
}

/** ترتيب افتراضي لملف B عند فشل مطابقة العناوين */
export function bPositionalMap(colCount: number): ColumnMap {
  const keys = [
    "nextFollowUpAt",
    "clientWarmingText",
    "managementRecommendationText",
    "name",
    "daysCount",
    "company",
    "phone",
    "activity",
    "position",
    "address",
    "quotePrice",
    "allowedDiscount",
    "salesNotes",
    "sourceAdName",
    "adPlatform",
    "visitAppointmentScheduled",
    "clientType",
    "presentingEmployeeName",
    "visitAppointmentDate",
    "lossReason",
    "qqAnswer",
    "currentSituation",
    "managementRecommendationDate",
    "initialCallDate",
  ] as const;
  const byField: Record<string, number | null> = {};
  for (let i = 0; i < keys.length; i++) {
    byField[keys[i]] = i < colCount ? i : null;
  }
  const contactCol = Math.min(23, Math.max(0, colCount - 1));
  return { contactCol, nextFollowCol: 0, byField };
}

function getCell(row: unknown[], idx: number | null | undefined): unknown {
  if (idx === null || idx === undefined || idx < 0) return "";
  return row[idx] ?? "";
}

export function buildFollowSlots(
  headerRow: unknown[],
  dataRow: unknown[],
  contactCol: number
): Array<{ order: number; note: string; date: string }> {
  const slots: Array<{ order: number; note: string; date: string }> = [];
  let c = contactCol + 1;
  while (c < headerRow.length) {
    const h = String(headerRow[c] ?? "");
    if (isFollowDateHeader(h)) {
      const hNote = c + 1 < headerRow.length ? String(headerRow[c + 1] ?? "") : "";
      const dateRaw = dataRow[c];
      let noteRaw: unknown = "";
      if (isFollowNoteHeader(hNote)) {
        noteRaw = dataRow[c + 1] ?? "";
        c += 2;
      } else {
        c += 1;
      }
      const dt = parseExcelDateCell(dateRaw);
      const note = cellStr(noteRaw);
      if (!dt && !note) continue;
      slots.push({
        order: slots.length + 1,
        date: dt ? dt.toISOString() : "",
        note,
      });
    } else {
      c += 1;
    }
  }
  return slots;
}

function nullIfEmpty(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t;
}

export type ParsedImportRow = {
  excelRow: number;
  name: string;
  company: string | null;
  phone: string;
  phone2: string | null;
  activity: string | null;
  position: string | null;
  address: string | null;
  quotePrice: string | null;
  allowedDiscount: string | null;
  salesNotes: string | null;
  sourceAdName: string | null;
  adPlatform: string | null;
  visitAppointmentScheduled: boolean;
  visitAppointmentDate: Date | null;
  presentingEmployeeName: string | null;
  lossReason: string | null;
  qqAnswer: boolean | null;
  currentSituation: string | null;
  callSummary: string | null;
  managementRecommendationText: string | null;
  managementRecommendationDate: Date | null;
  clientWarmingText: string | null;
  initialCallDate: Date | null;
  nextFollowUpAt: Date | null;
  followUpSlots: Array<{ order: number; note: string; date: string }>;
  clientTypeRaw: string | null;
  daysRaw: string | null;
};

export type ParseRowResult =
  | ParsedImportRow
  | { skip: true; reason: string; excelRow: number };

export function parseRowToImport(
  headerRow: unknown[],
  dataRow: unknown[],
  map: ColumnMap,
  excelRow: number
): ParseRowResult {
  const { byField, contactCol, nextFollowCol } = map;
  const rawPhoneCell = getCell(dataRow, byField.phone);
  const phoneParts = cellStr(rawPhoneCell)
    .split(/[/／]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const phoneMain = normalizeExcelPhone(
    phoneParts.length > 0 ? phoneParts[0] : rawPhoneCell
  );
  if (!phoneMain) {
    return { skip: true, reason: "لا رقم هاتف صالح", excelRow };
  }
  const phone2Norm = phoneParts[1]
    ? normalizeExcelPhone(phoneParts[1])
    : null;

  const name = cellStr(getCell(dataRow, byField.name));
  const contactName = cellStr(getCell(dataRow, byField.company));
  const finalName = name || contactName || `عميل ${phoneMain.slice(-4)}`;

  const disc = parseDiscount(getCell(dataRow, byField.allowedDiscount));
  const qNoteParts: string[] = [];
  if (disc.salesNoteAppend) qNoteParts.push(`خصم (نص): ${disc.salesNoteAppend}`);
  const baseNotes = cellStr(getCell(dataRow, byField.salesNotes));
  const mergedNotes = [baseNotes, ...qNoteParts].filter(Boolean).join("\n");
  const salesNotes = mergedNotes.trim() === "" ? null : mergedNotes;

  const slots = buildFollowSlots(headerRow, dataRow, contactCol);
  const nextFollowRaw =
    nextFollowCol !== null ? getCell(dataRow, nextFollowCol) : "";
  const nextFollowUpAt = parseExcelDateCell(nextFollowRaw);

  const visitSched = parseYesCell(
    getCell(dataRow, byField.visitAppointmentScheduled)
  );

  return {
    excelRow,
    name: finalName,
    company: contactName || null,
    phone: phoneMain,
    phone2: phone2Norm,
    activity: nullIfEmpty(cellStr(getCell(dataRow, byField.activity))),
    position: nullIfEmpty(cellStr(getCell(dataRow, byField.position))),
    address: nullIfEmpty(cellStr(getCell(dataRow, byField.address))),
    quotePrice: parseFirstQuotedPriceString(getCell(dataRow, byField.quotePrice)),
    allowedDiscount: disc.allowedDiscount,
    salesNotes,
    sourceAdName: nullIfEmpty(cellStr(getCell(dataRow, byField.sourceAdName))),
    adPlatform: nullIfEmpty(cellStr(getCell(dataRow, byField.adPlatform))),
    visitAppointmentScheduled: visitSched === true,
    visitAppointmentDate: parseExcelDateCell(
      getCell(dataRow, byField.visitAppointmentDate)
    ),
    presentingEmployeeName: nullIfEmpty(
      cellStr(getCell(dataRow, byField.presentingEmployeeName))
    ),
    lossReason: nullIfEmpty(cellStr(getCell(dataRow, byField.lossReason))),
    qqAnswer: parseYesCell(getCell(dataRow, byField.qqAnswer)),
    currentSituation: nullIfEmpty(
      cellStr(getCell(dataRow, byField.currentSituation))
    ),
    callSummary: null,
    managementRecommendationText: nullIfEmpty(
      cellStr(getCell(dataRow, byField.managementRecommendationText))
    ),
    managementRecommendationDate: parseExcelDateCell(
      getCell(dataRow, byField.managementRecommendationDate)
    ),
    clientWarmingText: nullIfEmpty(
      cellStr(getCell(dataRow, byField.clientWarmingText))
    ),
    initialCallDate: parseExcelDateCell(
      getCell(dataRow, byField.initialCallDate)
    ),
    nextFollowUpAt,
    followUpSlots: slots,
    clientTypeRaw: nullIfEmpty(cellStr(getCell(dataRow, byField.clientType))),
    daysRaw: nullIfEmpty(cellStr(getCell(dataRow, byField.daysCount))),
  };
}

export function loadSheetAoa(buf: Buffer): unknown[][] | null {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  } catch {
    return null;
  }
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return null;
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });
}

export function resolveColumnMap(aoa: unknown[][]): ColumnMap {
  const header = aoa[0] ?? [];
  const w = Math.max(...aoa.map((r) => r.length), 0);
  return buildColumnMap(header) ?? bPositionalMap(w);
}

export function parseAllImportRows(aoa: unknown[][], map: ColumnMap): {
  rows: ParsedImportRow[];
  skippedNoPhone: number;
  errors: { row: number; reason: string }[];
} {
  if (!aoa.length) return { rows: [], skippedNoPhone: 0, errors: [] };
  const headerRow = aoa[0] ?? [];
  const rows: ParsedImportRow[] = [];
  const errors: { row: number; reason: string }[] = [];
  let skippedNoPhone = 0;
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i] ?? [];
    const excelRow = i + 1;
    try {
      const parsed = parseRowToImport(headerRow, row, map, excelRow);
      if ("skip" in parsed) {
        skippedNoPhone++;
        continue;
      }
      rows.push(parsed);
    } catch (e) {
      errors.push({
        row: excelRow,
        reason: e instanceof Error ? e.message : "خطأ غير معروف",
      });
    }
  }
  return { rows, skippedNoPhone, errors };
}

export function countImportableRows(aoa: unknown[][], map: ColumnMap): number {
  return parseAllImportRows(aoa, map).rows.length;
}

export function previewDataRows(
  aoa: unknown[][],
  map: ColumnMap,
  max: number
): unknown[][] {
  const headerRow = aoa[0] ?? [];
  const out: unknown[][] = [];
  for (let i = 1; i < aoa.length && out.length < max; i++) {
    const row = aoa[i] ?? [];
    const p = parseRowToImport(headerRow, row, map, i + 1);
    if ("skip" in p) continue;
    out.push(row);
  }
  return out;
}
