/** Parses form date strings; date-only `YYYY-MM-DD` uses local noon to avoid TZ day shifts. */
export function parseOptionalDate(
  isoOrLocal: string | undefined | null
): Date | null {
  const raw = isoOrLocal?.trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * يغلق منتقي التاريخ الأصلي بعد اختيار يوم (Safari/Firefox غالباً لا يغلقون عند `blur` مرة واحدة).
 */
export function scheduleCloseNativeDatePicker(
  el: HTMLInputElement | null | undefined
): void {
  if (!el) return;
  const run = () => {
    try {
      el.blur();
    } catch {
      /* ignore */
    }
  };
  queueMicrotask(run);
  setTimeout(run, 0);
  setTimeout(run, 120);
}
