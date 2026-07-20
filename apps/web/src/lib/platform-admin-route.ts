import { AuthError, forbiddenResponse, unauthorizedResponse } from "./auth-helpers";
import { NextResponse } from "next/server";
import { clientIpFromRequest, rateLimit } from "./rate-limit";

export function platformAdminErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    if (error.message === "请先登录") {
      return unauthorizedResponse(error.message);
    }

    return forbiddenResponse(error.message);
  }

  return NextResponse.json(
    {
      ok: false,
      error: error instanceof Error ? error.message : "平台管理接口执行失败",
    },
    { status: 500 },
  );
}

export async function enforcePlatformAdminWriteRateLimit(
  request: Request,
  actorId: string,
  action: string,
  limit = 24,
  windowMs = 60_000,
) {
  const ip = clientIpFromRequest(request);
  const result = await rateLimit(`platform-admin:${action}:${actorId}:${ip}`, limit, windowMs);
  if (result.ok) return null;

  return NextResponse.json(
    {
      ok: false,
      error: "平台管理操作过于频繁，请稍后再试",
      rateLimit: {
        remaining: result.remaining,
        resetAt: result.resetAt,
        backend: result.backend,
      },
    },
    { status: 429 },
  );
}
