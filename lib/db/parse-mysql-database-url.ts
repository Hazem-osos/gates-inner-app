/**
 * يستخرج إعدادات الاتصال من `DATABASE_URL` (صيغة Prisma / MySQL).
 * يدعم: `mysql://user:pass@host:3306/dbname?params`
 */
export type MysqlConnectionConfig = {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
};

export function parseMysqlDatabaseUrl(
  raw: string | undefined
): MysqlConnectionConfig | null {
  if (!raw?.trim()) return null;
  let s = raw.trim();
  if (s.startsWith("prisma+")) {
    s = s.replace(/^prisma\+/, "");
  }
  try {
    const u = new URL(s);
    if (u.protocol !== "mysql:") return null;
    const database = decodeURIComponent(
      (u.pathname || "").replace(/^\//, "").split("?")[0] ?? ""
    );
    if (!database) return null;
    const user = decodeURIComponent(u.username || "root");
    const password = decodeURIComponent(u.password || "");
    const host = u.hostname || "localhost";
    const port = u.port ? Number(u.port) : 3306;
    if (!Number.isFinite(port) || port < 1 || port > 65535) return null;
    return { user, password, host, port, database };
  } catch {
    return null;
  }
}
