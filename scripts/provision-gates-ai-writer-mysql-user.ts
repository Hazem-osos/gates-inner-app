/**
 * يوزر gates_ai_writer — INSERT على NewLead + SELECT على Client و User.
 *
 *   GATES_AI_WRITER_PASSWORD='...' npx tsx scripts/provision-gates-ai-writer-mysql-user.ts
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

const WRITER_USER = "gates_ai_writer";
const WRITER_HOST = "%";

async function main() {
  const password = process.env.GATES_AI_WRITER_PASSWORD?.trim();
  if (!password) {
    console.error("عيّن GATES_AI_WRITER_PASSWORD قبل التشغيل.");
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
  const passEsc = password.replace(/\\/g, "\\\\").replace(/'/g, "''");
  const u = WRITER_USER;
  const h = WRITER_HOST;

  const statements = [
    `DROP USER IF EXISTS '${u}'@'${h}'`,
    `CREATE USER '${u}'@'${h}' IDENTIFIED BY '${passEsc}'`,
    `GRANT SELECT, INSERT ON \`${dbId}\`.\`NewLead\` TO '${u}'@'${h}'`,
    `GRANT SELECT ON \`${dbId}\`.\`Client\` TO '${u}'@'${h}'`,
    `GRANT SELECT ON \`${dbId}\`.\`User\` TO '${u}'@'${h}'`,
    "FLUSH PRIVILEGES",
    `SHOW GRANTS FOR '${u}'@'${h}'`,
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
  console.log(`\nتم: ${u}@${h}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
