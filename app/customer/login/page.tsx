import { Suspense } from "react";

import { CustomerLoginForm } from "@/components/helpdesk/customer-login-form";

export default function CustomerLoginPage() {
  return (
    <div
      dir="rtl"
      className="flex min-h-full flex-col items-center justify-center bg-muted/30 px-4 py-16"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
        <CustomerLoginForm />
      </Suspense>
    </div>
  );
}
