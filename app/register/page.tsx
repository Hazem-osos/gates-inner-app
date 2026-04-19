import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/register-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "تسجيل مستخدم",
};

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  if (process.env.ALLOW_OPEN_REGISTRATION !== "true") {
    redirect("/login");
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <RegisterForm />
      <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
        العودة لتسجيل الدخول
      </Link>
    </div>
  );
}
