import { mkdir, unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

import type { MysqlConnectionConfig } from "@/lib/db/parse-mysql-database-url";

/** تهريب قيمة كلمة المرور لملف خيارات عميل MySQL */
function escapeIniPassword(p: string): string {
  return p.replace(/\\/g, "\\\\").replace(/\n/g, " ").replace(/"/g, '\\"');
}

/**
 * ينشئ ملف `--defaults-file` مؤقت (صلاحيات 600) لتجنب تمرير كلمة المرور في سطر الأوامر.
 * يجب حذف الملف بعد انتهاء الأمر.
 */
export async function createMysqlClientDefaultsFile(
  cfg: MysqlConnectionConfig
): Promise<string> {
  const dir = join(tmpdir(), "crm-mysql-backup");
  await mkdir(dir, { recursive: true });
  const path = join(dir, `client-${randomUUID()}.cnf`);
  const content = [
    "[client]",
    `user=${cfg.user}`,
    `password="${escapeIniPassword(cfg.password)}"`,
    `host=${cfg.host}`,
    `port=${cfg.port}`,
    "",
  ].join("\n");
  await writeFile(path, content, { encoding: "utf8", mode: 0o600 });
  return path;
}

export async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    /* ignore */
  }
}
