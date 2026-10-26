/**
 * يوزر قراءة فقط لـ gates-ai-gateway على MySQL-yByc.
 *
 *   GATES_AI_GW_DB_PASSWORD="$(railway variables --service gates-ai-gateway --json | node -p 'JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).DB_PASSWORD')" \
 *     npx tsx scripts/provision-gates-ai-gw-mysql-user.ts
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { once } from "node:events";

import {
  createMysqlClientDefaultsFile,
  safeUnlink,
} from "../lib/db/mysql-client-defaults-file";
import { parseMysqlDatabaseUrl } from "../lib/db/parse-mysql-database-url";
import { resolveMysqlClientBin } from "../lib/db/resolve-mysql-client-bins";

const GW_USER = "gates_ai_gw";
const GW_HOST = "%";
const LEGACY_RO_USER = "gates_ai_ro";
const LEGACY_RO_HOST = "140.248.50.51";

async function main() {
  const gwPassword = process.env.GATES_AI_GW_DB_PASSWORD?.trim();
  if (!gwPassword) {
    console.error("عيّن GATES_AI_GW_DB_PASSWORD (نفس DB_PASSWORD في gates-ai-gateway).");
    process.exit(1);
  }

  const cfg = parseMysqlDatabaseUrl(process.env.DATABASE_URL);
  if (!cfg) {
    console.error("DATABASE_URL غير صالح في .env");
    process.exit(1);
  }

  const cnfPath = await createMysqlClientDefaultsFile(cfg);
  const mysqlBin = resolveMysqlClientBin();
  const dbId = cfg.database.replace(/`/g, "``");
  const passEsc = gwPassword.replace(/\\/g, "\\\\").replace(/'/g, "''");

  const statements = [
    `DROP USER IF EXISTS '${LEGACY_RO_USER}'@'${LEGACY_RO_HOST}'`,
    `DROP USER IF EXISTS '${GW_USER}'@'${GW_HOST}'`,
    `CREATE USER '${GW_USER}'@'${GW_HOST}' IDENTIFIED BY '${passEsc}'`,
    `GRANT SELECT ON \`${dbId}\`.* TO '${GW_USER}'@'${GW_HOST}'`,
    "FLUSH PRIVILEGES",
    `SHOW GRANTS FOR '${GW_USER}'@'${GW_HOST}'`,
  ];

  const proc = spawn(mysqlBin, [`--defaults-file=${cnfPath}`, "-e", statements.join("; ")], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  proc.stdout?.setEncoding("utf8");
  proc.stderr?.setEncoding("utf8");
  proc.stdout?.on("data", (c) => {
    stdout += String(c);
  });
  proc.stderr?.on("data", (c) => {
    stderr += String(c);
  });

  const [code] = await once(proc, "close");
  await safeUnlink(cnfPath);

  if (code !== 0) {
    console.error(stderr.trim() || stdout.trim() || `mysql exit ${String(code)}`);
    process.exit(code ?? 1);
  }

  console.log(stdout.trim());
  console.log(`\nتم: ${GW_USER}@${GW_HOST} — SELECT على ${cfg.database}`);
  console.log(`تم حذف ${LEGACY_RO_USER}@${LEGACY_RO_HOST} إن وُجد.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
