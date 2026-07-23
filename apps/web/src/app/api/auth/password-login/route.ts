import { AuthError } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientIpFromRequest, rateLimit } from "@/lib/rate-limit";

function safePath(raw: FormDataEntryValue | null, fallback: string) {
  const value = String(raw || fallback);
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}

async function resolvePostLoginPath(email: string, requested: string) {
  // 显式回调（非默认）优先
  if (
    requested &&
    requested !== "/onboarding" &&
    requested !== "/dashboard" &&
    requested.startsWith("/")
  ) {
    return requested;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      onboarded: true,
      owner: {
        select: {
          projects: {
            where: { status: "active" },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });

  const projectId = user?.owner?.projects?.[0]?.id;
  if (projectId) return `/projects/${projectId}/agent`;
  if (user?.onboarded) return "/dashboard";
  return "/onboarding";
}

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const limited = await rateLimit(`auth:login:${ip}`, 30, 15 * 60 * 1000);
  if (!limited.ok && limited.backend !== "fail-closed") {
    return NextResponse.redirect(
      new URL("/login?error=RateLimited", request.url),
      303,
    );
  }

  const formData = await request.formData();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const requested = safePath(formData.get("callbackUrl"), "/onboarding");

  if (!email || !password) {
    return NextResponse.redirect(
      new URL("/login?error=MissingFields", request.url),
      303,
    );
  }

  let callbackUrl = requested;
  try {
    callbackUrl = await resolvePostLoginPath(email, requested);
  } catch {
    callbackUrl = requested;
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
    return NextResponse.redirect(new URL(callbackUrl, request.url), 303);
  } catch (error) {
    // 成功时 Auth.js 会抛出 NEXT_REDIRECT
    if (
      typeof error === "object" &&
      error &&
      "digest" in error &&
      String((error as { digest?: string }).digest || "").startsWith(
        "NEXT_REDIRECT",
      )
    ) {
      throw error;
    }
    if (error instanceof AuthError) {
      return NextResponse.redirect(
        new URL("/login?error=CredentialsSignin", request.url),
        303,
      );
    }
    console.error("[auth] password-login failed", error);
    return NextResponse.redirect(
      new URL("/login?error=CredentialsSignin", request.url),
      303,
    );
  }
}
