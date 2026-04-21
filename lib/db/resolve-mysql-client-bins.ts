import { existsSync } from "node:fs";

/**
 * مسارات شائعة لعميل MySQL بدون الاعتماد على PATH فقط (macOS Homebrew، Linux، إلخ).
 */
const MYSQLDUMP_CANDIDATES = [
  "/opt/homebrew/opt/mysql-client/bin/mysqldump",
  "/opt/homebrew/opt/mysql@8.4/bin/mysqldump",
  "/opt/homebrew/opt/mysql@8.0/bin/mysqldump",
  "/opt/homebrew/opt/mysql/bin/mysqldump",
  "/usr/local/opt/mysql-client/bin/mysqldump",
  "/usr/local/opt/mysql@8.0/bin/mysqldump",
  "/usr/local/mysql/bin/mysqldump",
  "/usr/bin/mysqldump",
  "/usr/local/bin/mysqldump",
];

const MYSQL_CANDIDATES = [
  "/opt/homebrew/opt/mysql-client/bin/mysql",
  "/opt/homebrew/opt/mysql@8.4/bin/mysql",
  "/opt/homebrew/opt/mysql@8.0/bin/mysql",
  "/opt/homebrew/opt/mysql/bin/mysql",
  "/usr/local/opt/mysql-client/bin/mysql",
  "/usr/local/opt/mysql@8.0/bin/mysql",
  "/usr/local/mysql/bin/mysql",
  "/usr/bin/mysql",
  "/usr/local/bin/mysql",
];

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** اسم تنفيذي واحد لمُلخَص قاعدة البيانات */
export function resolveMysqldumpBin(): string {
  const fromEnv =
    process.env.MYSQLDUMP_PATH?.trim() || process.env.MYSQLDUMP_BIN?.trim();
  if (fromEnv) {
    if (existsSync(fromEnv)) return fromEnv;
    return fromEnv;
  }
  return firstExisting(MYSQLDUMP_CANDIDATES) ?? "mysqldump";
}

/** عميل mysql للاستعادة من ملف SQL */
export function resolveMysqlClientBin(): string {
  const fromEnv = process.env.MYSQL_PATH?.trim() || process.env.MYSQL_BIN?.trim();
  if (fromEnv) {
    if (existsSync(fromEnv)) return fromEnv;
    return fromEnv;
  }
  return firstExisting(MYSQL_CANDIDATES) ?? "mysql";
}
