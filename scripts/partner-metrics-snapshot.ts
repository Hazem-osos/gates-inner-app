/**
 * نفس JSON لـ GET /api/partner/metrics — للتشغيل محلياً أو على Railway CLI.
 *
 *   npx tsx scripts/partner-metrics-snapshot.ts
 */
import "dotenv/config";

import { buildPartnerMetricsSnapshot } from "../lib/data/partner-metrics-snapshot";

async function main() {
  const snapshot = await buildPartnerMetricsSnapshot();
  console.log(JSON.stringify(snapshot, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
