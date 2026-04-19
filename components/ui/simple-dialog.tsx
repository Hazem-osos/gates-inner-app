"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function SimpleDialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="simple-dialog-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="simple-dialog-title" className="mb-3 text-lg font-semibold">
          {title}
        </h2>
        <div className="text-sm">{children}</div>
        {footer ? (
          <div className="mt-4 flex justify-end gap-2">{footer}</div>
        ) : (
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
