/** Removes invisible / bidi control chars that often appear before Latin letters (B, C, …) in RTL contexts. */
export function sanitizeDisplayLabel(
  s: string | null | undefined
): string {
  if (s == null) return "";
  return s
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u200E\u200F\u061C]/g, "")
    .trim();
}
