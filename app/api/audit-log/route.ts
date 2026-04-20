import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth-helpers";
import type {
  AuditWorkClientGroup,
} from "@/lib/audit/work-log-types";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type { AuditWorkClientGroup, AuditWorkEvent } from "@/lib/audit/work-log-types";

function auditEventLines(log: {
  kind: string;
  action: string | null;
  summary: string;
  meta: unknown;
}): string[] {
  const meta = log.meta as Record<string, unknown> | null | undefined;
  if (
    meta &&
    typeof meta === "object" &&
    meta.v === 2 &&
    Array.isArray(meta.lines)
  ) {
    return (meta.lines as unknown[]).map((x) => String(x));
  }
  if (log.kind === "RECOMMENDATION_REPORT_PATCH") {
    return ["تحديث على توصية إدارية (بدون عرض نص التوصية أو الإجراء)"];
  }
  if (log.kind === "INTERACTION_LOG") {
    const m = meta as Record<string, unknown> | undefined;
    const nx = m?.nextFollowUpAt;
    let at = "";
    if (typeof nx === "string") at = nx.slice(0, 10);
    else if (nx instanceof Date) at = nx.toISOString().slice(0, 10);
    return [`تسجيل متابعة${at ? ` — متابعة تالية بتاريخ ${at}` : ""}`];
  }
  if (log.kind === "REPORT_ROW_STYLE") {
    return [log.summary];
  }
  if (log.kind === "REPORT_CELL_EDIT" || log.action === "REPORT_CELL_EDIT") {
    return ["تعديل من تقرير (سجل قديم — تفاصيل غير مفصاة)"];
  }
  return [log.summary || log.kind];
}

/** سجل عمل المستخدم الحالي على العملاء ضمن نطاق تواريخ — عميل واحد لكل صف مع أحداث مرتبة */
export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get("userId") ?? session.id;
  if (userIdParam !== session.id && session.role !== "ADMIN" && session.role !== "MANAGER") {
    return NextResponse.json({ message: "غير مصرح بعرض سجل مستخدم آخر." }, { status: 403 });
  }

  const reportKey = searchParams.get("reportKey")?.trim() || null;

  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  if (!fromStr || !toStr) {
    return NextResponse.json(
      { message: "معاملات من تاريخ وإلى تاريخ مطلوبة." },
      { status: 400 }
    );
  }

  const from = new Date(fromStr);
  const to = new Date(toStr);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ message: "تواريخ غير صالحة." }, { status: 400 });
  }

  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  try {
    const baseWhere: Prisma.AuditLogWhereInput = {
      userId: userIdParam,
      clientId: { not: null },
      createdAt: { gte: from, lte: end },
    };

    const where: Prisma.AuditLogWhereInput = reportKey
      ? {
          ...baseWhere,
          meta: {
            path: "reportKey",
            equals: reportKey,
          },
        }
      : baseWhere;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 2000,
    });

    const byClient = new Map<string, AuditWorkClientGroup>();

    for (const l of logs) {
      const cid = l.clientId;
      if (!cid) continue;
      if (!byClient.has(cid)) {
        byClient.set(cid, {
          clientId: cid,
          clientName: l.client?.name ?? "—",
          company: l.client?.company ?? null,
          events: [],
        });
      }
      byClient.get(cid)!.events.push({
        id: l.id,
        createdAt: l.createdAt.toISOString(),
        lines: auditEventLines(l),
      });
    }

    const groups = Array.from(byClient.values()).sort((a, b) => {
      const ta = Math.max(
        0,
        ...a.events.map((e) => new Date(e.createdAt).getTime())
      );
      const tb = Math.max(
        0,
        ...b.events.map((e) => new Date(e.createdAt).getTime())
      );
      return tb - ta;
    });

    return NextResponse.json({ groups });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "فشل الجلب." }, { status: 500 });
  }
}
