import { NextResponse } from "next/server";

import { auth } from "@/auth";

export default auth((req) => {
  const loggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const portal = (req.auth?.user as { portal?: string } | undefined)?.portal;

  if (path.startsWith("/login")) {
    if (loggedIn && (portal === "crm" || !portal)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (path.startsWith("/register")) {
    if (loggedIn && (portal === "crm" || !portal)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (path.startsWith("/support/login")) {
    if (loggedIn && portal === "support") {
      return NextResponse.redirect(new URL("/support/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (path.startsWith("/customer/login")) {
    if (loggedIn && portal === "customer") {
      return NextResponse.redirect(new URL("/customer/tickets", req.url));
    }
    return NextResponse.next();
  }

  if (path.startsWith("/support")) {
    if (!loggedIn || portal !== "support") {
      const url = new URL("/support/login", req.url);
      url.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const customerPortalPaths = [
    "/customer/tickets",
    "/customer/history",
  ];
  const isCustomerPortal = customerPortalPaths.some((p) =>
    path.startsWith(p)
  );
  if (isCustomerPortal) {
    if (!loggedIn || portal !== "customer") {
      const url = new URL("/customer/login", req.url);
      url.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const protectedPrefixes = [
    "/dashboard",
    "/clients",
    "/admin",
    "/reports",
    "/warming",
    "/settings",
  ];
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));

  if (!loggedIn && isProtected) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  if (loggedIn && isProtected && portal && portal !== "crm") {
    if (portal === "support") {
      return NextResponse.redirect(new URL("/support/dashboard", req.url));
    }
    if (portal === "customer") {
      return NextResponse.redirect(new URL("/customer/tickets", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|secverify).*)"],
};
