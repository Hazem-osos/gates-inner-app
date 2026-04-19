"use client";

import * as React from "react";

type FieldHintProps = {
  children: React.ReactNode;
  /** Text shown in the browser’s native tooltip on hover */
  title: string;
  className?: string;
};

/**
 * Wraps a form control so hover shows the full value via `title`.
 * Uses `display: contents` so layout matches an unwrapped control.
 */
export function FieldHint({ children, title, className }: FieldHintProps) {
  return (
    <span className={className ?? "contents"} title={title}>
      {children}
    </span>
  );
}

export default FieldHint;
