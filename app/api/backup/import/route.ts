import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

const MAX_SQL_BYTES = 250 * 1024 * 1024;

export async function POST(req: Request) {
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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ message: "طلب غير صالح." }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ message: "لم يُرفع ملف." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".sql")) {
    return NextResponse.json(
      { message: "يُقبل ملف .sql فقط." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SQL_BYTES) {
    return NextResponse.json(
      { message: `حجم الملف يتجاوز الحد (${Math.floor(MAX_SQL_BYTES / (1024 * 1024))} ميجابايت).` },
      { status: 400 }
    );
  }

  const sqlPath = join(tmpdir(), `crm-restore-${randomUUID()}.sql`);
  const cnfPath = await createMysqlClientDefaultsFile(cfg);

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(sqlPath, buf, { mode: 0o600 });

    const args = [`--defaults-file=${cnfPath}`, cfg.database];
    const proc = spawn("mysql", args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    let stderr = "";
    proc.stderr?.setEncoding("utf8");
    proc.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });

    if (!proc.stdin) {
      proc.kill("SIGKILL");
      return NextResponse.json(
        { message: "تعذر تشغيل mysql." },
        { status: 500 }
      );
    }

    const exitPromise = once(proc, "close");
    const input = createReadStream(sqlPath);
    let code: number | null;
    try {
      await pipeline(input, proc.stdin);
      [code] = await exitPromise;
    } catch (pipeErr) {
      proc.kill("SIGKILL");
      throw pipeErr;
    }

    if (code !== 0) {
      return NextResponse.json(
        {
          message:
            stderr.trim() ||
            `فشل استيراد SQL (رمز ${String(code)}). تحقق من صحة الملف وتوافق القاعدة.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "تم استرجاع النسخة الاحتياطية بنجاح.",
    });
  } catch (e) {
    console.error("backup import", e);
    return NextResponse.json(
      {
        message:
          e instanceof Error
            ? e.message
            : "فشل تنفيذ mysql. تأكد أن أداة العميل مثبتة على الخادم.",
      },
      { status: 500 }
    );
  } finally {
    await safeUnlink(sqlPath);
    await safeUnlink(cnfPath);
  }
}
