/** عرض موحّد لأسماء المستخدمين بعد الحذف الناعم */
export const DELETED_USER_LABEL_AR = "مستخدم محذوف";

export function userDisplayName(
  u: {
    name: string;
    deletedAt?: Date | string | null;
  } | null | undefined
): string {
  if (!u) return "—";
  if (u.deletedAt != null && u.deletedAt !== "") {
    return DELETED_USER_LABEL_AR;
  }
  return u.name;
}
