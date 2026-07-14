import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const protectedPrefixes = ["/dashboard", "/projects", "/profile", "/billing"];
const authPages = new Set(["/login", "/register"]);

function isProtectedPath(pathname: string) {
  return pathname === "/onboarding" || protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isLoggedIn = Boolean(req.auth?.user);
  const isOnboarded = Boolean((req.auth?.user as { onboarded?: boolean } | undefined)?.onboarded);

  if (!isLoggedIn && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", req.nextUrl);
    const callbackUrl = `${pathname}${req.nextUrl.search}`;
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && authPages.has(pathname)) {
    return NextResponse.redirect(new URL(isOnboarded ? "/dashboard" : "/onboarding", req.nextUrl));
  }

  if (isLoggedIn && !isOnboarded && pathname !== "/onboarding" && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL("/onboarding", req.nextUrl));
  }

  if (isLoggedIn && isOnboarded && pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/profile/:path*",
    "/billing/:path*",
    "/billing",
    "/login",
    "/register",
    "/onboarding",
  ],
};
