import { NextResponse } from "next/server";

/** Domain ownership check for security scanning — public, no auth */
const SECSCAN_VERIFY_TOKEN = "secscan-verify-0da4d461ed7140f4";

export async function GET() {
  const html = `<!DOCTYPE html>
<html><body>
  ${SECSCAN_VERIFY_TOKEN}
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
