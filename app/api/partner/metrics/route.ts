import { NextResponse } from "next/server";

import { buildPartnerMetricsSnapshot } from "@/lib/data/partner-metrics-snapshot";
import {
  authorizePartnerRequest,
  partnerApiNotConfiguredResponse,
} from "@/lib/partner-api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!process.env.PARTNER_API_KEY?.trim()) {
    const { status, body } = partnerApiNotConfiguredResponse();
    return NextResponse.json(body, { status });
  }

  if (!authorizePartnerRequest(req)) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }

  try {
    const snapshot = await buildPartnerMetricsSnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[partner/metrics]", e);
    return NextResponse.json(
      { message: "تعذّر تجميع الأرقام." },
      { status: 500 }
    );
  }
}
