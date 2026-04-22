import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";

/**
 * مسارات شائعة لعميل MySQL بدون الاعتماد على PATH فقط (macOS Homebrew، Linux، إلخ).
 * يُفضَّل وضع `/opt/homebrew/bin` أولاً — غالباً ما يُربَط فيه `brew link mysql-client`
 * بينما يُشغَّل Next من IDE بـ PATH أقصر من الطرفية.
 */
const MYSQLDUMP_CANDIDATES = [
  "/opt/homebrew/bin/mysqldump",
  "/usr/local/bin/mysqldump",
  "/opt/homebrew/opt/mysql-client/bin/mysqldump",
  "/opt/homebrew/opt/mysql@9/bin/mysqldump",
  "/opt/homebrew/opt/mysql@8.4/bin/mysqldump",
  "/opt/homebrew/opt/mysql@8.3/bin/mysqldump",
  "/opt/homebrew/opt/mysql@8.2/bin/mysqldump",
  "/opt/homebrew/opt/mysql@8.0/bin/mysqldump",
  "/opt/homebrew/opt/mysql/bin/mysqldump",
  "/opt/homebrew/opt/mariadb/bin/mysqldump",
  "/usr/local/opt/mysql-client/bin/mysqldump",
  "/usr/local/opt/mysql@8.0/bin/mysqldump",
  "/usr/local/mysql/bin/mysqldump",
  "/usr/bin/mysqldump",
];

const MYSQL_CANDIDATES = [
  "/opt/homebrew/bin/mysql",
  "/usr/local/bin/mysql",
  "/opt/homebrew/opt/mysql-client/bin/mysql",
  "/opt/homebrew/opt/mysql@9/bin/mysql",
  "/opt/homebrew/opt/mysql@8.4/bin/mysql",
  "/opt/homebrew/opt/mysql@8.3/bin/mysql",
  "/opt/homebrew/opt/mysql@8.2/bin/mysql",
  "/opt/homebrew/opt/mysql@8.0/bin/mysql",
  "/opt/homebrew/opt/mysql/bin/mysql",
  "/opt/homebrew/opt/mariadb/bin/mysql",
  "/usr/local/opt/mysql-client/bin/mysql",
  "/usr/local/opt/mysql@8.0/bin/mysql",
  "/usr/local/mysql/bin/mysql",
  "/usr/bin/mysql",
];

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** البحث عن تنفيذي في مجلدات PATH (مفيد عند تشغيل التطبيق من IDE) */
function findInPath(executable: string): string | null {
  const dirs = process.env.PATH?.split(delimiter).filter(Boolean) ?? [];
  for (const dir of dirs) {
    const full = join(dir, executable);
    if (existsSync(full)) return full;
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
  return (
    firstExisting(MYSQLDUMP_CANDIDATES) ??
    findInPath("mysqldump") ??
    "mysqldump"
  );
}

/** عميل mysql للاستعادة من ملف SQL */
export function resolveMysqlClientBin(): string {
  const fromEnv = process.env.MYSQL_PATH?.trim() || process.env.MYSQL_BIN?.trim();
  if (fromEnv) {
    if (existsSync(fromEnv)) return fromEnv;
    return fromEnv;
  }
  return firstExisting(MYSQL_CANDIDATES) ?? findInPath("mysql") ?? "mysql";
}
