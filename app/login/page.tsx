import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  const showRegister = process.env.ALLOW_OPEN_REGISTRATION === "true";
  return (
    <div
      dir="rtl"
      className="flex min-h-full flex-col items-center justify-center bg-muted/30 px-4 py-16"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">جاري التحميل…</p>}>
        <LoginForm showRegister={showRegister} />
      </Suspense>
    </div>
  );
}
