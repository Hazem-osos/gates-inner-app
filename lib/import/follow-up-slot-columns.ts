/**
 * أعمدة متابعة مسطّحة في Excel (نص + تاريخ لكل خانة).
 * حد معقول للملفات؛ يمكن زيادته عند الحاجة.
 */
export const MAX_FOLLOW_UP_SLOTS_EXCEL = 30;

export function followUpSlotNoteKey(i: number): string {
  return `followUpSlot${i}Note`;
}

export function followUpSlotDateKey(i: number): string {
  return `followUpSlot${i}Date`;
}

/** عنوان عمود التصدير — يطابق استيراد العملاء المسطّح */
export function followUpSlotNoteHeaderAr(i: number): string {
  return `متابعة ${i} — نص`;
}

export function followUpSlotDateHeaderAr(i: number): string {
  return `متابعة ${i} — تاريخ`;
}

/** مرادفات شائعة لعناوين الاستيراد (مطابقة أعمدة قديمة أو أخطاء إملائية) */
export function followUpSlotNoteHeaderAliases(i: number): string[] {
  return [
    followUpSlotNoteHeaderAr(i),
    `متابعه ${i} — نص`,
    `متابعة ${i}`,
    `follow up ${i} note`,
  ];
}

export function followUpSlotDateHeaderAliases(i: number): string[] {
  return [
    followUpSlotDateHeaderAr(i),
    `متابعه ${i} — تاريخ`,
    `تاريخ متابعه ${i}`,
    `تاريخ متابعة ${i}`,
    `follow up ${i} date`,
  ];
}

/** تحويل الأرقام العربية ٠١٢… إلى 012… */
export function normalizeArabicDigitsToWestern(s: string): string {
  return s.replace(/[\u0660-\u0669]/g, (ch) =>
    String(ch.charCodeAt(0) - 0x0660)
  );
}

/**
 * يستنتج من عنوان عمود Excel (مثل تصدير التقرير) المفتاح المنطقي followUpSlot{N}Note|Date.
 * يُستخدم في الاستيراد دون إدراج كل خانة في قائمة الحقول.
 */
export function parseFollowUpSlotColumnHeader(header: string): {
  slotIndex: number;
  part: "note" | "date";
} | null {
  const raw = String(header ?? "").trim();
  if (!raw) return null;
  const h = normalizeArabicDigitsToWestern(raw);

  const eng = /^followUpSlot(\d+)(Note|Date)$/i.exec(h);
  if (eng) {
    const n = Number(eng[1]);
    if (n < 1 || n > MAX_FOLLOW_UP_SLOTS_EXCEL) return null;
    return {
      slotIndex: n,
      part: eng[2].toLowerCase() === "note" ? "note" : "date",
    };
  }

  const ar = /متابعة\s*(\d+)\s*[—\-]\s*(نص|تاريخ)/.exec(h);
  if (ar) {
    const n = Number(ar[1]);
    if (n < 1 || n > MAX_FOLLOW_UP_SLOTS_EXCEL) return null;
    return { slotIndex: n, part: ar[2] === "نص" ? "note" : "date" };
  }

  const arAlt = /متابعه\s*(\d+)\s*[—\-]\s*(نص|تاريخ)/.exec(h);
  if (arAlt) {
    const n = Number(arAlt[1]);
    if (n < 1 || n > MAX_FOLLOW_UP_SLOTS_EXCEL) return null;
    return { slotIndex: n, part: arAlt[2] === "نص" ? "note" : "date" };
  }

  return null;
}
