/** تخزين معاني الألوان الثلاثة لكل تقرير — متصفح فقط (لا مزامنة سيرفر). */

export const REPORT_ROW_COLOR_LEGEND_STORAGE_PREFIX =
  "crm-gates:report-row-color-legend:v1:";

export type RowColorLegendLabels = {
  red: string;
  yellow: string;
  green: string;
};

const EMPTY: RowColorLegendLabels = { red: "", yellow: "", green: "" };

export function readLegendLabelsFromStorage(
  reportKey: string
): RowColorLegendLabels {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(
      REPORT_ROW_COLOR_LEGEND_STORAGE_PREFIX + reportKey
    );
    if (!raw) return { ...EMPTY };
    const o = JSON.parse(raw) as Partial<RowColorLegendLabels>;
    return {
      red: String(o.red ?? ""),
      yellow: String(o.yellow ?? ""),
      green: String(o.green ?? ""),
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeLegendLabelsToStorage(
  reportKey: string,
  labels: RowColorLegendLabels
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    REPORT_ROW_COLOR_LEGEND_STORAGE_PREFIX + reportKey,
    JSON.stringify(labels)
  );
}
