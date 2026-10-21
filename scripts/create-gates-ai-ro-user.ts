/**
 * مرة واحدة: يوزر قراءة فقط لـ AI من IP محدد.
 * تشغيل: npx tsx scripts/create-gates-ai-ro-user.ts
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

const RO_USER = "gates_ai_ro";
const RO_CLIENT_IP = "140.248.50.51";
async function main() {
  const roPassword = process.env.GATES_AI_RO_PASSWORD?.trim();
  if (!roPassword) {
    console.error("عيّن GATES_AI_RO_PASSWORD في البيئة قبل التشغيل.");
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
  const passEsc = roPassword.replace(/\\/g, "\\\\").replace(/'/g, "''");

  const statements = [
    `DROP USER IF EXISTS '${RO_USER}'@'${RO_CLIENT_IP}'`,
    `CREATE USER '${RO_USER}'@'${RO_CLIENT_IP}' IDENTIFIED BY '${passEsc}'`,
    `GRANT SELECT ON \`${dbId}\`.* TO '${RO_USER}'@'${RO_CLIENT_IP}'`,
    "FLUSH PRIVILEGES",
    `SHOW GRANTS FOR '${RO_USER}'@'${RO_CLIENT_IP}'`,
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
  console.log(`\nتم إنشاء ${RO_USER}@${RO_CLIENT_IP} — SELECT فقط على ${cfg.database}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
