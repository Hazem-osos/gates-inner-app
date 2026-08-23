"use client";

import { useCallback, useEffect, useState } from "react";

import { GatePassphraseDialog } from "@/components/helpdesk/gate-passphrase-dialog";
import { PortalHub } from "@/components/helpdesk/portal-hub";

export function HomePortalGate() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);

  const check = useCallback(async () => {
    const res = await fetch("/api/gate/verify");
    const j = (await res.json()) as { unlocked?: boolean };
    setUnlocked(Boolean(j.unlocked));
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  if (unlocked === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        جاري التحميل…
      </div>
    );
  }

  if (!unlocked) {
    return (
      <>
        <div className="flex min-h-[40vh] items-center justify-center px-4 text-center text-muted-foreground">
          هذه الصفحة محمية برمز بوابة.
        </div>
        <GatePassphraseDialog open onUnlocked={() => setUnlocked(true)} />
      </>
    );
  }

  return <PortalHub />;
}
