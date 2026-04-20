import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { NextResponse } from "next/server";

import { getSessionUser, isAdmin } from "@/lib/auth-helpers";
import {
  createMysqlClientDefaultsFile,
  safeUnlink,
} from "@/lib/db/mysql-client-defaults-file";
import { parseMysqlDatabaseUrl } from "@/lib/db/parse-mysql-database-url";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 403 });
  }

  const cfg = parseMysqlDatabaseUrl(process.env.DATABASE_URL);
  if (!cfg) {
    return NextResponse.json(
      { message: "DATABASE_URL غير صالح أو ليس MySQL." },
      { status: 500 }
    );
  }

  const cnfPath = await createMysqlClientDefaultsFile(cfg);
  const dumpPath = join(tmpdir(), `crm-backup-${randomUUID()}.sql`);

  try {
    const args = [
      `--defaults-file=${cnfPath}`,
      "--single-transaction",
      "--routines",
      "--triggers",
      "--no-tablespaces",
      cfg.database,
    ];

    const proc = spawn("mysqldump", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    if (!proc.stdout) {
      await safeUnlink(dumpPath);
      return NextResponse.json(
        { message: "تعذر تشغيل mysqldump." },
        { status: 500 }
      );
    }

    let stderr = "";
    proc.stderr?.setEncoding("utf8");
    proc.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });

    const exitPromise = once(proc, "close");
    const out = createWriteStream(dumpPath, { mode: 0o600 });
    let code: number | null;
    try {
      await pipeline(proc.stdout, out);
      [code] = await exitPromise;
    } catch (pipeErr) {
      proc.kill("SIGKILL");
      await safeUnlink(dumpPath);
      throw pipeErr;
    }

    if (code !== 0) {
      await safeUnlink(dumpPath);
      return NextResponse.json(
        {
          message: stderr.trim() || `فشل mysqldump (رمز ${String(code)}).`,
        },
        { status: 500 }
      );
    }

    const st = await stat(dumpPath);
    if (st.size === 0) {
      await safeUnlink(dumpPath);
      return NextResponse.json(
        { message: "النسخة الاحتياطية فارغة — تحقق من الاتصال واسم القاعدة." },
        { status: 500 }
      );
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `backup-${dateStr}-${cfg.database}.sql`;

    const stream = createReadStream(dumpPath);
    stream.on("close", () => {
      void safeUnlink(dumpPath);
    });
    stream.on("error", () => {
      void safeUnlink(dumpPath);
    });

    const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    await safeUnlink(dumpPath);
    console.error("backup export", e);
    return NextResponse.json(
      {
        message:
          e instanceof Error
            ? e.message
            : "فشل تنفيذ mysqldump. تأكد أن الأداة مثبتة على الخادم.",
      },
      { status: 500 }
    );
  } finally {
    await safeUnlink(cnfPath);
  }
}
