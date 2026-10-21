import { timingSafeEqual } from "node:crypto";

function readExpectedPartnerApiKey(): string | null {
  const raw = process.env.PARTNER_API_KEY?.trim();
  return raw && raw.length >= 16 ? raw : null;
}

/** يتحقق من ‎Authorization: Bearer <PARTNER_API_KEY>‎ */
export function authorizePartnerRequest(req: Request): boolean {
  const expected = readExpectedPartnerApiKey();
  if (!expected) return false;

  const header = req.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const provided = match?.[1]?.trim() ?? "";
  if (!provided) return false;

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function partnerApiNotConfiguredResponse(): {
  status: number;
  body: { message: string };
} {
  return {
    status: 503,
    body: {
      message:
        "PARTNER_API_KEY غير مضبوط على السيرفر. اطلب من مسؤول النشر إضافته في Railway.",
    },
  };
}
