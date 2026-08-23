"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GatePassphraseDialog({
  open,
  onUnlocked,
}: {
  open: boolean;
  onUnlocked: () => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/gate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        toast.error(j.message ?? "فشل التحقق.");
        return;
      }
      toast.success("تم فتح البوابة.");
      onUnlocked();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md" dir="rtl">
        <CardHeader>
          <CardTitle>بوابة الدخول</CardTitle>
          <p className="text-sm text-muted-foreground">
            أدخل رمز البوابة للوصول إلى اختيار البوابات.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gate-pass">رمز البوابة</Label>
              <Input
                id="gate-pass"
                type="password"
                autoComplete="off"
                dir="ltr"
                className="text-left"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "جاري التحقق…" : "دخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
