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
