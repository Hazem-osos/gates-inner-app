import { NextResponse } from "next/server";

import { auth } from "@/auth";

export default auth((req) => {
  const loggedIn = !!req.auth;
  const path = req.nextUrl.pathname;

  if (path.startsWith("/login")) {
    if (loggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (path.startsWith("/register")) {
    if (loggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  const protectedPrefixes = [
    "/dashboard",
    "/clients",
    "/admin",
    "/reports",
    "/warming",
  ];
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));

  if (!loggedIn && isProtected) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
