import type { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { clientIpFromRequest, rateLimit } from "@/lib/rate-limit";

export const { GET } = handlers;

/** 登录防爆破：按 IP 限制 Credentials 回调频率 */
export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const limited = await rateLimit(`auth:login:${ip}`, 30, 15 * 60 * 1000);
  if (!limited.ok && limited.backend !== "fail-closed") {
    // #region debug-point login-failure-route-limit
    return Response.json(
      { error: "登录尝试过于频繁，请稍后再试" },
      {
        status: 429,
        headers: {
          "X-MK-Auth-RateLimit-Backend": limited.backend ?? "unknown",
          "X-MK-Auth-RateLimit-IP": ip || "unknown",
          "X-MK-Auth-RateLimit-Reset-At": String(limited.resetAt),
          "Retry-After": String(Math.max(1, Math.ceil((limited.resetAt - Date.now()) / 1000))),
        },
      },
    );
    // #endregion
  }

  return handlers.POST(request);
}
