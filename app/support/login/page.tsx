import { Suspense } from "react";

import { SupportLoginForm } from "@/components/helpdesk/support-login-form";

export default function SupportLoginPage() {
  return (
    <div
      dir="rtl"
      className="flex min-h-full flex-col items-center justify-center bg-muted/30 px-4 py-16"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
        <SupportLoginForm />
      </Suspense>
    </div>
  );
}
