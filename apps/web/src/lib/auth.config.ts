/**
 * Edge-safe Auth.js 配置（供 middleware 使用）
 * 禁止在此文件 import prisma / fs / path / bcrypt 等 Node 模块。
 */
import type { NextAuthConfig } from "next-auth";

function resolveTrustHost(): boolean {
  if (process.env.AUTH_TRUST_HOST === "false") return false;
  if (process.env.AUTH_TRUST_HOST === "true") return true;
  // Cloudflare Tunnel / 反代域名下必须信任 Host，否则会话 Cookie 写不稳
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  if (/trycloudflare\.com|cloudflare|ngrok/i.test(authUrl)) return true;
  // 生产环境默认不信任 Host，防止 Host header 注入
  if (process.env.NODE_ENV === "production") return false;
  // 开发默认信任，避免本机 / 隧道 Host 不一致导致反复登录
  return true;
}

function resolveUseSecureCookies(): boolean | undefined {
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  if (authUrl.startsWith("https://")) return true;
  if (authUrl.startsWith("http://")) return false;
  // 交由 Auth.js 按请求协议判断
  return undefined;
}

export const authConfig = {
  trustHost: resolveTrustHost(),
  secret:
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "production" ? undefined : "dev-only-auth-secret"),
  ...(resolveUseSecureCookies() === undefined
    ? {}
    : { useSecureCookies: resolveUseSecureCookies() }),
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as { id?: string }).id;
        token.email = user.email;
        token.onboarded = Boolean(
          (user as { onboarded?: boolean }).onboarded,
        );
      } else if (trigger === "update" && session) {
        if (typeof (session as { onboarded?: unknown }).onboarded !== "undefined") {
          token.onboarded = Boolean(
            (session as { onboarded?: boolean }).onboarded,
          );
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { onboarded?: boolean }).onboarded = Boolean(
          token.onboarded,
        );
      }
      return session;
    },
    authorized() {
      // 路由门禁由 middleware.ts 自行处理；此处放行
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
} satisfies NextAuthConfig;
