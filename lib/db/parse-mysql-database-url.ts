/**
 * يستخرج إعدادات الاتصال من `DATABASE_URL` (صيغة Prisma / MySQL).
 * يدعم: `mysql://user:pass@host:3306/dbname?params`
 */
export type MysqlSslModeForClient = "REQUIRED" | "DISABLED";

export type MysqlConnectionConfig = {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
  /**
   * عند Remote (مثل Aiven) يُستخدم TLS.
   * على localhost دون سطر ssl-mode يبقى سلوك العميل الافتراضي (مناسب لقواعد محلية بلا TLS).
   */
  sslModeForClient?: MysqlSslModeForClient;
};

function resolveSslModeForClient(
  host: string,
  searchParams: URLSearchParams
): MysqlSslModeForClient | undefined {
  const raw =
    searchParams.get("ssl-mode") ??
    searchParams.get("sslmode") ??
    searchParams.get("ssl-mode-for-client");
  const v = raw?.trim().toLowerCase();
  if (v === "disabled" || v === "0" || v === "false" || v === "off") {
    return "DISABLED";
  }
  if (
    v === "required" ||
    v === "verify_ca" ||
    v === "verify_identity" ||
    v === "strict"
  ) {
    return "REQUIRED";
  }
  const h = host.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") {
    return undefined;
  }
  return "REQUIRED";
}

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
    const sslModeForClient = resolveSslModeForClient(host, u.searchParams);
    return {
      user,
      password,
      host,
      port,
      database,
      sslModeForClient,
    };
  } catch {
    return null;
  }
}
