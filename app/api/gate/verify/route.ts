import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createGateCookieValue,
  GATE_COOKIE_NAME,
  gateCookieOptions,
  verifyGateCookieValue,
} from "@/lib/helpdesk/gate-cookie";

export async function POST(req: Request) {
  let body: { passphrase?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "طلب غير صالح." }, { status: 400 });
  }
  const passphrase = (body.passphrase ?? "").trim();
  const expected = process.env.ADMIN_GATE_SECRET?.trim();
  const devFallback =
    process.env.NODE_ENV !== "production" ? "dev-gate" : "";
  const secret = expected || devFallback;
  if (!secret) {
    return NextResponse.json(
      { message: "بوابة الدخول غير مهيأة على الخادم." },
      { status: 503 }
    );
  }
  if (passphrase !== secret) {
    return NextResponse.json(
      { message: "رمز البوابة غير صحيح." },
      { status: 403 }
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    GATE_COOKIE_NAME,
    createGateCookieValue(),
    gateCookieOptions()
  );
  return res;
}

export async function GET() {
  const jar = await cookies();
  const ok = verifyGateCookieValue(jar.get(GATE_COOKIE_NAME)?.value);
  return NextResponse.json({ unlocked: ok });
}
