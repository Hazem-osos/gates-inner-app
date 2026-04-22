"use client";

import { SessionProvider } from "next-auth/react";

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      basePath="/api/auth"
      /** أثناء dev يقلّل إعادة جلب الجلسة عند التركيز؛ يخفف تعارضاً مع recompile يعطي 500 و HTML بدل JSON. */
      refetchOnWindowFocus={process.env.NODE_ENV !== "development"}
    >
      {children}
    </SessionProvider>
  );
}
