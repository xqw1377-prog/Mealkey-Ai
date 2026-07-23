/**
 * Auth 辅助函数
 *
 * 提供 REST API 路由的认证中间件。
 * 通过 next-auth session 验证用户身份。
 */
import { auth } from "./auth";
import { headers } from "next/headers";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

function getPlatformAdminEmails() {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function resolveRequestHost(): string | null {
  try {
    return headers().get("host");
  } catch {
    return null;
  }
}

export async function getLocalPreviewUser(host?: string | null): Promise<AuthenticatedUser | null> {
  void host;
  void resolveRequestHost();
  return null;
}

/**
 * 从请求中提取认证用户
 * 验证 session → 返回用户信息
 * 如果未认证返回 null
 */
export async function getAuthenticatedUser(host?: string | null): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth();
    if (session?.user?.id) {
      return {
        id: session.user.id,
        email: session.user.email ?? "",
      };
    }
  } catch {
    // ignore and return unauthenticated state
  }

  void host;
  return null;
}

/**
 * 需要认证的 API 路由包装函数
 * 未认证返回 401
 */
export async function requireAuth(host?: string | null): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(host);
  if (!user) {
    throw new AuthError("请先登录");
  }
  return user;
}

export function isPlatformAdmin(user: AuthenticatedUser) {
  const allowList = getPlatformAdminEmails();
  // 未配置白名单时默认拒绝，避免全员管理员；本地需显式配置 PLATFORM_ADMIN_EMAILS
  if (allowList.length === 0) {
    return false;
  }

  return !!user.email && allowList.includes(user.email.toLowerCase());
}

export async function requirePlatformAdmin(host?: string | null): Promise<AuthenticatedUser> {
  const user = await requireAuth(host);
  if (!isPlatformAdmin(user)) {
    throw new AuthError("仅平台管理员可访问");
  }
  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * 返回 401 Response
 */
export function unauthorizedResponse(message = "请先登录"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export function forbiddenResponse(message = "无权访问"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
