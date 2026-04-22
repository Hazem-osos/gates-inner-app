"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser, isManagerOrAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type DeleteClientResult = { ok: true } | { ok: false; message: string };

function revalidateAfterClientChange(clientId: string) {
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/reports/b");
  revalidatePath("/reports/not-b");
  revalidatePath("/reports/closed");
  revalidatePath("/reports/recommendations");
  revalidatePath("/reports/won");
  revalidatePath("/reports/calls");
  revalidatePath("/reports/warming");
  revalidatePath("/reports/transferred");
  revalidatePath("/warming");
}

/** حذف دائم للعميل وجميع السجلات المرتبطة (متابعات، توصيات، …) — المدراء والمسؤولون فقط. */
export async function deleteClientByIdAction(
  clientId: string
): Promise<DeleteClientResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "غير مصرح." };
  if (!isManagerOrAdmin(session.role)) {
    return { ok: false, message: "هذا الإجراء متاح للإدارة فقط." };
  }

  const id = clientId?.trim();
  if (!id) return { ok: false, message: "معرّف العميل غير صالح." };

  const exists = await prisma.client.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) return { ok: false, message: "العميل غير موجود." };

  try {
    await prisma.client.delete({ where: { id } });
    revalidateAfterClientChange(id);
    return { ok: true };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      message: "تعذّر حذف العميل. قد تبقى بيانات مرتبطة — راجع الاتصال بقاعدة البيانات.",
    };
  }
}
