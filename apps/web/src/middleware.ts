import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const protectedPrefixes = ["/dashboard", "/projects", "/profile", "/billing"];
const authPages = new Set(["/login", "/register"]);

function isProtectedPath(pathname: string) {
  return (
    pathname === "/onboarding" ||
    protectedPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isLoggedIn = Boolean(req.auth?.user);
  const isOnboarded = Boolean(
    (req.auth?.user as { onboarded?: boolean } | undefined)?.onboarded,
  );

  if (!isLoggedIn && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", req.nextUrl);
    const callbackUrl = `${pathname}${req.nextUrl.search}`;
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && authPages.has(pathname)) {
    return NextResponse.redirect(
      new URL(isOnboarded ? "/dashboard" : "/onboarding", req.nextUrl),
    );
  }

  // 首次登录未完成基础信息：先进 onboarding
  // 例外：已在对话 Agent 页时不踢回，避免「打不开对话」
  const isAgentPath = /^\/projects\/[^/]+\/agent$/.test(pathname);
  if (
    isLoggedIn &&
    !isOnboarded &&
    pathname !== "/onboarding" &&
    isProtectedPath(pathname) &&
    !isAgentPath
  ) {
    return NextResponse.redirect(new URL("/onboarding", req.nextUrl));
  }

  // 已完成基础信息仍打开 onboarding：回对话入口（dashboard 会再进 Agent）
  // ?force=1 允许补填/重修基础信息
  if (
    isLoggedIn &&
    isOnboarded &&
    pathname === "/onboarding" &&
    req.nextUrl.searchParams.get("force") !== "1"
  ) {
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
