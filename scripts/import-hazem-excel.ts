/**
 * One-off import from Hazemexcel.xlsx into Prisma (MySQL).
 * Run: npm run import:excel
 *
 * Loads `.env` so `DATABASE_URL` matches your current DB (e.g. Aiven).
 * Maps sheets → Client + Interaction (+ optional WarmingToolSent).
 * Extra columns go to client.customFields (JSON).
 */

import "dotenv/config";

import * as fs from "node:fs";
import * as path from "node:path";

import { Prisma, PrismaClient, ClientStatus } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

const ROOT = process.cwd();
const XLSX_PATH = path.join(ROOT, "Hazemexcel.xlsx");

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (s === "#N/A" || s === "#NAME?" || s === "#VALUE!") return "";
  return s;
}

/** MySQL default `String?` columns are short; keep status fields import-safe. */
const FOLLOWUP_STATUS_MAX = 180;

function narrowFollowUpStatus(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  return t.length <= FOLLOWUP_STATUS_MAX ? t : `${t.slice(0, FOLLOWUP_STATUS_MAX - 1)}…`;
}

/** Excel serial (days since 1899-12-30) → Date */
function excelSerialToDate(serial: unknown): Date | null {
  if (serial === null || serial === undefined || serial === "") return null;
  const n =
    typeof serial === "number"
      ? serial
      : Number(String(serial).replace(/,/g, ".").replace(/\s/g, ""));
  if (!Number.isFinite(n) || n < 1) return null;
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMaybeDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return excelSerialToDate(v);
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  return excelSerialToDate(v);
}

function parseDecimal(v: unknown): Prisma.Decimal | null {
  const s = str(v).replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (!s) return null;
  try {
    return new Prisma.Decimal(s);
  } catch {
    return null;
  }
}

function digitsPhone(v: unknown): string {
  return str(v).replace(/[^\d+]/g, "").slice(0, 32);
}

function phoneForDb(v: unknown, fallback: string): string {
  const d = digitsPhone(v);
  return d || fallback;
}

function buildHeaderMap(headerRow: unknown[]): Map<string, number> {
  const m = new Map<string, number>();
  if (!Array.isArray(headerRow)) return m;
  headerRow.forEach((cell, i) => {
    const key = str(cell).replace(/\s+/g, " ").trim();
    if (key) m.set(key, i);
  });
  return m;
}

function idx(
  map: Map<string, number>,
  exact: string[],
  contains?: string[]
): number | undefined {
  for (const e of exact) {
    if (map.has(e)) return map.get(e);
  }
  const keys = [...map.keys()];
  for (const c of contains ?? []) {
    const hit = keys.find((k) => k.includes(c));
    if (hit !== undefined) return map.get(hit);
  }
  return undefined;
}

function rowVal(row: unknown[], map: Map<string, number>, keys: string[], contains?: string[]): unknown {
  const i = idx(map, keys, contains);
  if (i === undefined || !Array.isArray(row)) return "";
  return row[i] ?? "";
}

async function defaultAssigneeId(): Promise<string | null> {
  const u = await prisma.user.findFirst({
    where: { role: "SALES", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return u?.id ?? null;
}

function sheetRows(sheetName: string): { headers: Map<string, number>; data: unknown[][] } | null {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error("Missing file:", XLSX_PATH);
    return null;
  }
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: false, raw: true });
  const sh = wb.Sheets[sheetName];
  if (!sh) {
    console.warn("Sheet not found:", sheetName);
    return null;
  }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sh, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];
  if (rows.length < 3) return { headers: new Map(), data: [] };
  const headers = buildHeaderMap(rows[1] as unknown[]);
  const data = rows.slice(2).filter((r) => Array.isArray(r) && r.some((c) => str(c)));
  return { headers, data };
}

async function importClientsB(assigneeId: string | null) {
  const pack = sheetRows("عملاء B");
  if (!pack) return 0;
  const { headers, data } = pack;
  let n = 0;
  for (const row of data) {
    const company = str(rowVal(row, headers, ["أسم الشركة"], ["شركة"]));
    const name = str(rowVal(row, headers, ["أسم المسئول"], ["مسئول"]));
    const phoneRaw = rowVal(row, headers, ["رقم التليفون"], ["تليفون", "هاتف"]);
    const phone = phoneForDb(phoneRaw, `nophone-${n}-${Date.now()}`);
    if (!company && !name) continue;

    const nextFollow = parseMaybeDate(rowVal(row, headers, ["تاريخ المتابعه التالي"], ["متابعه التالي"]));
    const visitDate = parseMaybeDate(rowVal(row, headers, ["تاريخ الزيارة"], ["زيارة"]));
    const quote = parseDecimal(rowVal(row, headers, ["عرض السعر"], ["سعر"]));
    const discount = parseDecimal(rowVal(row, headers, ["الخصم الممنوح"], ["خصم"]));

    const custom: Record<string, unknown> = {
      excel_sheet: "عملاء B",
      review_meeting_notes: str(rowVal(row, headers, ["توصيات اجتماع مراجعه موقف العملاء"], ["توصيات"])),
      days_count_excel: str(rowVal(row, headers, ["عدد الايام"], ["الايام"])),
      activity: str(rowVal(row, headers, ["النشاط"], [])),
      meeting_done: str(rowVal(row, headers, ["تم ميتنج ولا لا"], ["ميتنج"])),
      classification_excel: str(rowVal(row, headers, ["تصنيف العميل"], ["تصنيف"])),
      marketing_employee: str(rowVal(row, headers, ["موظف التسويق"], ["تسويق"])),
      sales_visitor: str(rowVal(row, headers, ["موظف المبيعات القائم بالزياره"], ["الزياره"])),
      manager_notes: str(rowVal(row, headers, ["ملاحظات  مدير المبيعات", "ملاحظات مدير المبيعات"], ["مدير المبيعات"])),
      current_situation: str(rowVal(row, headers, ["الموقف الحالي"], ["موقف"])),
      marketing_channel: str(rowVal(row, headers, ["قناة التسويق"], ["قناة"])),
    };

    const notesParts = [
      custom.review_meeting_notes && `توصيات المراجعة: ${custom.review_meeting_notes}`,
      custom.current_situation && `الموقف الحالي: ${custom.current_situation}`,
      custom.manager_notes && `مدير المبيعات: ${custom.manager_notes}`,
    ].filter(Boolean);
    const notes = notesParts.join("\n\n") || "استيراد من Excel — عملاء B";

    const interactionAt = visitDate ?? new Date();
    const nextAt =
      nextFollow ??
      new Date(interactionAt.getTime() + 7 * 86400 * 1000);

    const client = await prisma.client.create({
      data: {
        name: name || company || "عميل",
        phone,
        company: company || null,
        position: str(rowVal(row, headers, ["البوزيشن"], [])) || null,
        address: str(rowVal(row, headers, ["العنوان"], [])) || null,
        quotePrice: quote,
        allowedDiscount: discount,
        status: ClientStatus.B,
        sourceAdName: str(rowVal(row, headers, ["اسم الاعلان"], ["اعلان"])) || null,
        initialCallDate: parseMaybeDate(rowVal(row, headers, ["تاريخ الاتصال"], ["اتصال"])) ?? interactionAt,
        nextFollowUpAt: nextAt,
        customFields: custom as Prisma.InputJsonValue,
        assignedUserId: assigneeId,
      },
    });

    await prisma.interaction.create({
      data: {
        clientId: client.id,
        interactionAt,
        notes,
        followUpStatus: narrowFollowUpStatus(str(rowVal(row, headers, ["المتابعه الاولي"], ["متابعه"]))),
        nextFollowUpAt: nextAt,
        createdById: assigneeId,
      },
    });
    n++;
  }
  console.log("عملاء B:", n);
  return n;
}

async function importClientsNotB(assigneeId: string | null) {
  const pack = sheetRows("عملاء Not B");
  if (!pack) return 0;
  const { headers, data } = pack;
  let n = 0;
  for (const row of data) {
    const company = str(rowVal(row, headers, ["أسم الشركة"], ["شركة"]));
    const name = str(rowVal(row, headers, ["أسم المسئول"], ["مسئول"]));
    const phone = phoneForDb(rowVal(row, headers, ["رقم التليفون"], ["تليفون"]), `nophone-nb-${n}-${Date.now()}`);
    if (!company && !name) continue;

    const type = str(rowVal(row, headers, ["نوعية العميل"], ["نوعية"]));
    const status =
      type.toUpperCase() === "B" ? ClientStatus.B : ClientStatus.NOT_B;

    const nextFollow = parseMaybeDate(
      rowVal(row, headers, ["تاريخ المتابعه ", "تاريخ المتابعه"], ["متابعه"])
    );
    const visitDate = parseMaybeDate(rowVal(row, headers, ["تاريخ الزيارة"], []));

    const custom: Record<string, unknown> = {
      excel_sheet: "عملاء Not B",
      ai_instructions: str(rowVal(row, headers, ["تعليمات تنمية مهارات AI"], ["AI"])),
      meeting_recommendations: str(rowVal(row, headers, ["توصيات الاجتماع"], [])),
      warming_planned: str(rowVal(row, headers, ["ادوات Warming سترسل للعميل"], ["Warming"])),
      days_count_excel: str(rowVal(row, headers, ["عدد الايام ", "عدد الايام"], ["ايام"])),
      activity: str(rowVal(row, headers, ["النشاط"], [])),
      meeting_done: str(rowVal(row, headers, ["تم ميتنج ولا لا "], ["ميتنج"])),
      sales_employee: str(rowVal(row, headers, ["موظف المبيعات"], [])),
      close_reason: str(rowVal(row, headers, ["سبب الاغلاق لعملاء المغلقة"], ["اغلاق"])),
      final_status: str(rowVal(row, headers, ["الموقف النهائي"], [])),
      marketing_channel: str(rowVal(row, headers, ["قناة التسويق"], [])),
    };

    const notes =
      str(rowVal(row, headers, ["الموقف الحالي"], ["موقف"])) ||
      "استيراد من Excel — Not B";

    const interactionAt = visitDate ?? new Date();
    const nextAt = nextFollow ?? new Date(interactionAt.getTime() + 7 * 86400 * 1000);

    const client = await prisma.client.create({
      data: {
        name: name || company || "عميل",
        phone,
        company: company || null,
        position: str(rowVal(row, headers, ["البوزيشن"], [])) || null,
        address: str(rowVal(row, headers, ["العنوان"], [])) || null,
        quotePrice: parseDecimal(rowVal(row, headers, ["عرض السعر"], [])),
        allowedDiscount: parseDecimal(rowVal(row, headers, ["الخصم الممنوح"], ["خصم"])),
        status,
        sourceAdName: str(rowVal(row, headers, ["اسم الاعلان"], [])) || null,
        initialCallDate: parseMaybeDate(rowVal(row, headers, ["تاريخ الاتصال"], [])) ?? interactionAt,
        nextFollowUpAt: nextAt,
        customFields: custom as Prisma.InputJsonValue,
        assignedUserId: assigneeId,
      },
    });

    await prisma.interaction.create({
      data: {
        clientId: client.id,
        interactionAt,
        notes,
        followUpStatus: narrowFollowUpStatus(custom.final_status ? String(custom.final_status) : null),
        nextFollowUpAt: nextAt,
        createdById: assigneeId,
      },
    });
    n++;
  }
  console.log("عملاء Not B:", n);
  return n;
}

async function importClientsWon(assigneeId: string | null) {
  const pack = sheetRows("عملاء تم البيع لهم");
  if (!pack) return 0;
  const { headers, data } = pack;
  let n = 0;
  for (const row of data) {
    const company = str(rowVal(row, headers, ["أسم الشركة"], ["شركة"]));
    const name = str(rowVal(row, headers, ["أسم المسئول"], ["مسئول"]));
    const phone = phoneForDb(rowVal(row, headers, ["رقم التليفون"], ["تليفون"]), `won-${n}-${Date.now()}`);
    if (!company && !name) continue;

    const saleDate =
      parseMaybeDate(rowVal(row, headers, ["تاريخ البيع"], ["تاريخ اتمام", "تاريخ إتمام"])) ??
      parseMaybeDate(rowVal(row, headers, ["تاريخ الاغلاق"], ["اغلاق"]));
    const contractValue = parseDecimal(
      rowVal(row, headers, ["قيمة العقد", "قيمه العقد"], ["قيمة", "عقد"])
    );

    const custom: Record<string, unknown> = {
      excel_sheet: "عملاء تم البيع لهم",
      extra: collectUnmapped(row, headers, [
        "أسم الشركة",
        "أسم المسئول",
        "رقم التليفون",
        "تاريخ البيع",
        "قيمة العقد",
        "قيمه العقد",
      ]),
    };

    const interactionAt = saleDate ?? new Date();
    const nextAt = interactionAt;

    const client = await prisma.client.create({
      data: {
        name: name || company || "عميل",
        phone,
        company: company || null,
        position: str(rowVal(row, headers, ["البوزيشن"], [])) || null,
        address: str(rowVal(row, headers, ["العنوان"], [])) || null,
        quotePrice: parseDecimal(rowVal(row, headers, ["عرض السعر"], [])),
        status: ClientStatus.WON,
        saleDate: saleDate ?? interactionAt,
        contractValue,
        initialCallDate: parseMaybeDate(rowVal(row, headers, ["تاريخ الاتصال"], [])) ?? interactionAt,
        nextFollowUpAt: nextAt,
        customFields: custom as Prisma.InputJsonValue,
        assignedUserId: assigneeId,
      },
    });

    await prisma.clientStatusChange.create({
      data: {
        clientId: client.id,
        fromStatus: null,
        toStatus: ClientStatus.WON,
        note: "استيراد من Excel — تم البيع",
        changedById: assigneeId,
      },
    });

    await prisma.interaction.create({
      data: {
        clientId: client.id,
        interactionAt,
        notes: "استيراد من Excel — عميل مُباع",
        nextFollowUpAt: nextAt,
        createdById: assigneeId,
      },
    });
    n++;
  }
  console.log("عملاء تم البيع لهم:", n);
  return n;
}

async function importClientsLost(assigneeId: string | null) {
  const pack = sheetRows("عملاء تم اغلاقهم");
  if (!pack) return 0;
  const { headers, data } = pack;
  let n = 0;
  for (const row of data) {
    const company = str(rowVal(row, headers, ["أسم الشركة"], ["شركة"]));
    const name = str(rowVal(row, headers, ["أسم المسئول"], ["مسئول"]));
    const phone = phoneForDb(rowVal(row, headers, ["رقم التليفون"], ["تليفون"]), `lost-${n}-${Date.now()}`);
    if (!company && !name) continue;

    const lossReason =
      str(rowVal(row, headers, ["سبب الاغلاق", "سبب الإغلاق"], ["سبب"])) ||
      str(rowVal(row, headers, ["الموقف النهائي"], []));
    const closedLostAt =
      parseMaybeDate(rowVal(row, headers, ["تاريخ الاغلاق", "تاريخ الإغلاق"], ["اغلاق"])) ?? new Date();

    const custom: Record<string, unknown> = {
      excel_sheet: "عملاء تم اغلاقهم",
      extra: collectUnmapped(row, headers, ["أسم الشركة", "أسم المسئول", "رقم التليفون", "سبب الاغلاق", "تاريخ الاغلاق"]),
    };

    const interactionAt = closedLostAt;

    const client = await prisma.client.create({
      data: {
        name: name || company || "عميل",
        phone,
        company: company || null,
        position: str(rowVal(row, headers, ["البوزيشن"], [])) || null,
        address: str(rowVal(row, headers, ["العنوان"], [])) || null,
        status: ClientStatus.LOST,
        lossReason: lossReason || null,
        closedLostAt,
        initialCallDate: parseMaybeDate(rowVal(row, headers, ["تاريخ الاتصال"], [])) ?? interactionAt,
        nextFollowUpAt: closedLostAt,
        customFields: custom as Prisma.InputJsonValue,
        assignedUserId: assigneeId,
      },
    });

    await prisma.clientStatusChange.create({
      data: {
        clientId: client.id,
        fromStatus: null,
        toStatus: ClientStatus.LOST,
        note: lossReason || "استيراد من Excel — مغلق",
        changedById: assigneeId,
      },
    });

    await prisma.interaction.create({
      data: {
        clientId: client.id,
        interactionAt,
        notes: lossReason || "استيراد من Excel — عميل مُغلق",
        nextFollowUpAt: closedLostAt,
        createdById: assigneeId,
      },
    });
    n++;
  }
  console.log("عملاء تم اغلاقهم:", n);
  return n;
}

/** Store any columns we did not map explicitly into `customFields.extra`. */
function collectUnmapped(row: unknown[], map: Map<string, number>, skipExact: string[]): Record<string, string> {
  const skip = new Set(skipExact.map((s) => s.trim()));
  const out: Record<string, string> = {};
  for (const [header, colIndex] of map) {
    const h = header.trim();
    if (!h || skip.has(h)) continue;
    const v = str(Array.isArray(row) ? row[colIndex] : "");
    if (v) out[h] = v;
  }
  return out;
}

async function importWarming() {
  const pack = sheetRows("ادوات Warming مرسله للعميل");
  if (!pack) return 0;
  const { headers, data } = pack;
  let n = 0;
  for (const row of data) {
    const activity = str(rowVal(row, headers, ["النشاط"], []));
    const clientName = str(rowVal(row, headers, ["اسم العميل"], ["عميل"]));
    const phoneDigits = digitsPhone(rowVal(row, headers, ["الرقم "], ["الرقم"]));
    if (!clientName && !activity && !phoneDigits) continue;

    const or: Prisma.ClientWhereInput[] = [];
    if (clientName) {
      or.push({ name: clientName }, { company: clientName });
    }
    if (phoneDigits) or.push({ phone: phoneDigits });

    let client = or.length > 0 ? await prisma.client.findFirst({ where: { OR: or } }) : null;
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: clientName || activity || "عميل Warming",
          phone: phoneDigits || `warm-${n}-${Date.now()}`,
          company: activity || null,
          status: ClientStatus.NOT_B,
          customFields: { excel_sheet: "Warming-only" } as Prisma.InputJsonValue,
        },
      });
    }

    const communicatedAt = parseMaybeDate(rowVal(row, headers, ["تاريخ التواصل"], ["تواصل"]));

    await prisma.warmingToolSent.create({
      data: {
        clientId: client.id,
        communicatedAt,
        activitySnapshot: activity || null,
        day1Content: str(rowVal(row, headers, ["اليوم1"], ["يوم1"])) || null,
        day2Content: str(rowVal(row, headers, ["اليوم2"], ["يوم2"])) || null,
        day3Content: str(rowVal(row, headers, ["اليوم3"], ["يوم3"])) || null,
      },
    });
    n++;
  }
  console.log("Warming:", n);
  return n;
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("Missing DATABASE_URL. Set it in .env (see .env.example).");
    process.exit(1);
  }

  if (!fs.existsSync(XLSX_PATH)) {
    console.error("ضع الملف Hazemexcel.xlsx في جذر المشروع:", XLSX_PATH);
    process.exit(1);
  }

  if (process.env.EXCEL_IMPORT_RESET === "1") {
    console.log("EXCEL_IMPORT_RESET=1: حذف العملاء وكل المرتبط بهم…");
    await prisma.client.deleteMany();
  }

  const assigneeId = await defaultAssigneeId();
  console.log("Assignee (SALES):", assigneeId ?? "(null — run: npx prisma db seed)");

  let total = 0;
  total += await importClientsB(assigneeId);
  total += await importClientsNotB(assigneeId);
  total += await importClientsWon(assigneeId);
  total += await importClientsLost(assigneeId);
  total += await importWarming();

  console.log("\nتم الاستيراد. إجمالي سجلات جديدة (تقريبية):", total);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
