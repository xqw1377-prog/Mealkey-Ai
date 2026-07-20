/**
 * Vercel Cron / 运维巡检鉴权
 * Authorization: Bearer $CRON_SECRET 或 ?secret=
 */
export function authorizeCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // 未配置密钥时仅允许非生产本机调试
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization") || "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  const url = new URL(request.url);
  const q = url.searchParams.get("secret") || "";
  return bearer === secret || q === secret;
}
