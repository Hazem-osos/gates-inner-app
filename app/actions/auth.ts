"use server";

import { redirect } from "next/navigation";

import { signOut } from "@/auth";

/** تسجيل خروج عبر الخادم — يمسح الجلسة ثم يوجّه لصفحة الدخول دون الاعتماد على fetch من المتصفح. */
export async function signOutAndRedirectToLogin() {
  try {
    await signOut({ redirect: false, redirectTo: "/login" });
  } catch {
    /* تجاهل أخطاء Auth النادرة — التوجيه لصفحة الدخول يبقى */
  }
  redirect("/login");
}
