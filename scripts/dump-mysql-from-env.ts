/**
 * نسخ احتياطي لقاعدة MySQL باستخدام DATABASE_URL من .env
 * (مناسب لـ Aiven — يمرّر SSL).
 *
 * تشغيل من جذر المشروع:
 *   npx tsx scripts/dump-mysql-from-env.ts
 *
 * يحفظ الملف على سطح المكتب (macOS) أو HOME.
 *
 * يتطلب: mysqldump (brew install mysql-client && brew link mysql-client --force)
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

import {
  createMysqlClientDefaultsFile,
  safeUnlink,
} from "../lib/db/mysql-client-defaults-file";
import { parseMysqlDatabaseUrl } from "../lib/db/parse-mysql-database-url";
import { resolveMysqldumpBin } from "../lib/db/resolve-mysql-client-bins";

function desktopOrHome(): string {
  const desk = join(homedir(), "Desktop");
  return desk;
}

async function main() {
  const cfg = parseMysqlDatabaseUrl(process.env.DATABASE_URL);
  if (!cfg) {
    console.error(
      "DATABASE_URL غير موجود أو غير صالح في .env (توقّع mysql://user:pass@host:port/db)"
    );
    process.exit(1);
  }

  const cnfPath = await createMysqlClientDefaultsFile(cfg);
  const mysqldumpBin = resolveMysqldumpBin();

  const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const baseName = `crm-backup-${dateStr}-${cfg.database}.sql`;
  const outDir = desktopOrHome();
  await mkdir(outDir, { recursive: true }).catch(() => {});
  const outPath = join(outDir, baseName);

  const tmpPath = join(outDir, `.${randomUUID()}.sql.partial`);

  const args = [
    `--defaults-file=${cnfPath}`,
    "--single-transaction",
    "--set-gtid-purged=OFF",
    "--routines",
    "--triggers",
    "--no-tablespaces",
    cfg.database,
  ];

  const proc = spawn(mysqldumpBin, args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  proc.stderr?.setEncoding("utf8");
  proc.stderr?.on("data", (c) => {
    stderr += String(c);
  });

  try {
    await once(proc, "spawn");
  } catch (e) {
    await safeUnlink(cnfPath);
    const code =
      e && typeof e === "object" && "code" in e
        ? (e as { code?: string }).code
        : undefined;
    if (code === "ENOENT") {
      console.error(
        "لم يُعثر على mysqldump. ثبّت: brew install mysql-client && brew link mysql-client --force"
      );
    } else {
      console.error(e);
    }
    process.exit(1);
  }

  const ws = createWriteStream(tmpPath);
  try {
    if (!proc.stdout) throw new Error("no stdout");
    await pipeline(proc.stdout, ws);
  } catch (e) {
    await safeUnlink(cnfPath);
    await safeUnlink(tmpPath).catch(() => {});
    console.error(e);
    process.exit(1);
  }

  const [code] = await once(proc, "close");
  await safeUnlink(cnfPath);

  if (code !== 0) {
    await safeUnlink(tmpPath).catch(() => {});
    console.error(stderr.trim() || `فشل mysqldump (رمز ${String(code)}).`);
    process.exit(1);
  }

  await copyFile(tmpPath, outPath);
  await safeUnlink(tmpPath);

  console.log("تم حفظ النسخة الاحتياطية في:\n", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
