import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { buildExportPayload } from "@/lib/export/build-export-data";
import { getSessionUser, resolveSessionDbUserId } from "@/lib/auth-helpers";

/** أعمدة مقروءة في Excel */
function applyReadableGrid(ws: XLSX.WorkSheet) {
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  const cols: { wch: number }[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const headerAddr = XLSX.utils.encode_cell({ r: range.s.r, c });
    const cell = ws[headerAddr];
    const label =
      cell && typeof cell === "object" && "v" in cell && cell.v != null
        ? String(cell.v)
        : "";
    const wch = Math.min(42, Math.max(12, Math.ceil(label.length * 1.1) + 2));
    cols.push({ wch });
  }
  ws["!cols"] = cols;
}

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }
  const dbUserId = await resolveSessionDbUserId(session);
  if (!dbUserId) {
    return NextResponse.json({ message: "غير مصرح." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") ?? "report-b";

  try {
    const payload = await buildExportPayload(kind, searchParams, {
      id: dbUserId,
      role: session.role,
    });

    const wb = XLSX.utils.book_new();
    for (const sheet of payload.sheets) {
      const ws = XLSX.utils.json_to_sheet(
        sheet.rows.length ? sheet.rows : [{ رسالة: "لا بيانات" }]
      );
      applyReadableGrid(ws);
      XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName.slice(0, 31));
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const asciiName = `${kind.replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`;

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${asciiName}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "تعذر إنشاء الملف." },
      { status: 500 }
    );
  }
}
