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

const LOCAL_TEST_USER: AuthenticatedUser = {
  id: "local-test-user",
  email: "local-test@mealkey.local",
};

function getPlatformAdminEmails() {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export type PlatformAdminAccessReason =
  | "allowlist"
  | "local_preview"
  | "unauthenticated"
  | "forbidden"
  | "allowlist_empty";

/**
 * 只读探测：是否具备平台管理/观测访问权（不抛错）。
 */
export async function getPlatformAdminAccess(
  host?: string | null,
): Promise<{ isAdmin: boolean; reason: PlatformAdminAccessReason }> {
  const user = await getAuthenticatedUser(host);

  if (user && isPlatformAdmin(user)) {
    return { isAdmin: true, reason: "allowlist" };
  }

  if (
    isLocalAdminPreviewBypassEnabled(host) &&
    getPlatformAdminEmails().length === 0
  ) {
    return { isAdmin: true, reason: "local_preview" };
  }

  if (!user) {
    return { isAdmin: false, reason: "unauthenticated" };
  }

  if (getPlatformAdminEmails().length === 0) {
    return { isAdmin: false, reason: "allowlist_empty" };
  }

  return { isAdmin: false, reason: "forbidden" };
}

function resolveRequestHost(): string | null {
  try {
    return headers().get("host");
  } catch {
    return null;
  }
}

function isLocalPreviewHost(host?: string | null) {
  const value = (host ?? resolveRequestHost() ?? "").toLowerCase();
  return value.includes("localhost") || value.includes("127.0.0.1");
}

function isTruthyEnv(value?: string) {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * 仅开发环境 + 显式开关 + 本机 Host 时允许「未登录验收」旁路。
 * 公网隧道 / 生产绝不生效。MK_ALLOW_PUBLIC_PREVIEW_AUTH 必须显式打开。
 */
export function isLocalAdminPreviewBypassEnabled(host?: string | null): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (!isTruthyEnv(process.env.MK_ALLOW_PUBLIC_PREVIEW_AUTH)) return false;
  return isLocalPreviewHost(host);
}

function isLocalTestingBypassEnabled(host?: string | null): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return isLocalPreviewHost(host);
}

export async function getLocalPreviewUser(
  host?: string | null,
): Promise<AuthenticatedUser | null> {
  if (!isLocalTestingBypassEnabled(host) && !isLocalAdminPreviewBypassEnabled(host)) {
    return null;
  }

  const user = await getAuthenticatedUser(host);
  return user ?? LOCAL_TEST_USER;
}

/**
 * 从请求中提取认证用户
 * 验证 session → 返回用户信息
 * 如果未认证返回 null
 */
export async function getAuthenticatedUser(
  host?: string | null,
): Promise<AuthenticatedUser | null> {
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
export async function requireAuth(
  host?: string | null,
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(host);
  if (user) return user;

  const previewUser = await getLocalPreviewUser(host);
  if (previewUser) return previewUser;

  throw new AuthError("请先登录");
}

export function isPlatformAdmin(user: AuthenticatedUser) {
  const allowList = getPlatformAdminEmails();
  // 未配置白名单时默认拒绝，避免全员管理员；本地需显式配置 PLATFORM_ADMIN_EMAILS
  if (allowList.length === 0) {
    return false;
  }

  return !!user.email && allowList.includes(user.email.toLowerCase());
}

/**
 * 平台管理台鉴权：本机也不走「任意本地用户即管理员」。
 * - 正式路径：登录且邮箱在 PLATFORM_ADMIN_EMAILS
 * - 本机验收旁路：仅当 MK_ALLOW_PUBLIC_PREVIEW_AUTH=1 且白名单为空时，允许合成管理员
 */
export async function requirePlatformAdmin(
  host?: string | null,
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(host);
  if (user && isPlatformAdmin(user)) {
    return user;
  }

  // 仅本机开发验收：显式 MK_ALLOW_PUBLIC_PREVIEW_AUTH=1 时允许合成管理员
  if (isLocalAdminPreviewBypassEnabled(host)) {
    if (user && isPlatformAdmin(user)) return user;
    // 白名单为空时才给合成身份，避免绕过已配置的管理员列表
    if (getPlatformAdminEmails().length === 0) {
      return {
        id: "local-preview-admin",
        email: "local-preview@mealkey.local",
      };
    }
  }

  if (!user) {
    throw new AuthError("请先登录");
  }
  throw new AuthError("仅平台管理员可访问");
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
