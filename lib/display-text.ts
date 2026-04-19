/** Removes invisible / bidi control chars that often appear around Latin letters (B, C, …) in RTL contexts. */
export function sanitizeDisplayLabel(
  s: string | null | undefined
): string {
  if (s == null) return "";
  return s
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // LRM, RLM, ALM, bidi embedding / override / isolate (PDF, RLE, …)
    .replace(/[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g, "")
    .trim();
}
