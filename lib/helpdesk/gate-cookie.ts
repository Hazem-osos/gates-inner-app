import { createHmac, timingSafeEqual } from "crypto";

export const GATE_COOKIE_NAME = "gate_ok";
const GATE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.ADMIN_GATE_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_GATE_SECRET مطلوب في الإنتاج.");
  }
  return "dev-insecure-gate-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createGateCookieValue(now = Date.now()): string {
  const exp = now + GATE_TTL_MS;
  const payload = `${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyGateCookieValue(raw: string | undefined | null): boolean {
  if (!raw?.trim()) return false;
  const [expStr, sig] = raw.split(".");
  if (!expStr || !sig) return false;
  const expected = sign(expStr);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  return true;
}

export function gateCookieOptions(maxAgeSec = GATE_TTL_MS / 1000) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}
