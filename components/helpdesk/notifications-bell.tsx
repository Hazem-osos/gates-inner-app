"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type N = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export function SupportNotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<N[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/support/notifications");
    if (!res.ok) return;
    const j = (await res.json()) as { notifications: N[]; unreadCount: number };
    setItems(j.notifications);
    setUnread(j.unreadCount);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 20000);
    return () => clearInterval(t);
  }, [load]);

  async function markRead(ids: string[]) {
    await fetch("/api/support/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, isRead: true }),
    });
    void load();
  }

  return (
    <div className="relative">
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="الإشعارات"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div
          className={cn(
            "absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-background p-2 shadow-lg"
          )}
          dir="rtl"
        >
          <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">
            الإشعارات
          </p>
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                لا إشعارات
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-lg px-2 py-2 text-right text-xs hover:bg-muted",
                      !n.isRead && "bg-muted/60 font-medium"
                    )}
                    onClick={() => void markRead([n.id])}
                  >
                    <div className="font-semibold">{n.title}</div>
                    <div className="text-muted-foreground line-clamp-2">
                      {n.message}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
