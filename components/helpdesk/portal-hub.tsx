import Link from "next/link";
import { Headphones, LineChart } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PortalHub() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16" dir="rtl">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">GATES</h1>
        <p className="mt-2 text-muted-foreground">
          اختر البوابة المناسبة للمتابعة
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="ring-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LineChart className="size-5 text-primary" aria-hidden />
              بوابة المبيعات / CRM
            </CardTitle>
            <CardDescription>
              متابعة العملاء، التقارير، والإعدادات الداخلية للفريق.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/login"
              className={cn(buttonVariants(), "w-full inline-flex justify-center")}
            >
              الدخول إلى CRM
            </Link>
          </CardContent>
        </Card>
        <Card className="ring-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Headphones className="size-5 text-primary" aria-hidden />
              الدعم الفني والعمليات
            </CardTitle>
            <CardDescription>
              إدارة التذاكر، الوكلاء، والعملاء المرخّصين للدعم.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/support/login"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "w-full inline-flex justify-center"
              )}
            >
              الدخول إلى الدعم
            </Link>
          </CardContent>
        </Card>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        عملاء الشركات:{" "}
        <Link href="/customer/login" className="text-primary underline">
          تسجيل دخول العملاء
        </Link>
      </p>
    </div>
  );
}
