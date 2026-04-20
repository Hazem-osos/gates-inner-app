/** Marks commonly used as Arabic diacritics (tashkīl) and Quranic annotation. */
const ARABIC_DIACRITICS =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08E1\u08E3-\u08FF]/g;

const ALEF_VARIANTS = /[\u0622\u0623\u0625\u0671]/g; // آ أ إ ٱ
const TATWEEL = /\u0640/g;
const TEH_MARBUTA = /\u0629/g;
const ARABIC_YEH = /\u064A/g; // ي → ى
const FARSI_YEH = /\u06CC/g;

/**
 * Normalizes mixed Arabic/English header text for resilient column matching.
 * - Trims; NBSP → space; strips bidi / ZWNJ / tatweel.
 * - Lowercase (Latin letters).
 * - Removes Arabic diacritics.
 * - Unifies alef, teh marbuta, yeh variants.
 * - Collapses internal whitespace to a single space.
 */
export function normalizeArabicText(text: string): string {
  let s = String(text ?? "")
    .trim()
    .replace(/\u00a0/g, " ");
  if (!s) return "";

  s = s.replace(/[\u200c\u200d\u200e\u200f\uFEFF]/g, "");
  s = s.toLowerCase();
  s = s.replace(/_/g, " ");
  s = s.replace(ARABIC_DIACRITICS, "");
  s = s.replace(TATWEEL, "");
  s = s.replace(ALEF_VARIANTS, "\u0627");
  s = s.replace(TEH_MARBUTA, "\u0647");
  s = s.replace(ARABIC_YEH, "\u0649");
  s = s.replace(FARSI_YEH, "\u0649");
  s = s.replace(/\s+/g, " ");
  return s.trim();
}

/** Spaceless form for matching headers that omit spaces between words. */
export function compactNormalized(text: string): string {
  return normalizeArabicText(text).replace(/\s/g, "");
}
