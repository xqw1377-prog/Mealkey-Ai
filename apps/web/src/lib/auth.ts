import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";

const isProd = process.env.NODE_ENV === "production";

function resolveTrustHost(): boolean {
  if (process.env.AUTH_TRUST_HOST === "false") return false;
  if (process.env.AUTH_TRUST_HOST === "true") return true;
  // 生产默认不信任 Host；开发 / 明确代理环境再开启
  return !isProd;
}

export const config = {
  trustHost: resolveTrustHost(),
  secret: process.env.AUTH_SECRET || (isProd ? undefined : "dev-only-auth-secret"),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        const emailLimited = await rateLimit(`auth:login-email:${email}`, 10, 15 * 60 * 1000);
        if (!emailLimited.ok) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            onboarded: true,
            passwordHash: true,
          },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email!,
          name: user.name,
          image: user.image,
          onboarded: user.onboarded,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.onboarded = Boolean(user.onboarded);
      } else if (trigger === "update" && session) {
        // 仅允许白名单字段；email 变更必须走服务端验证流程
        if (typeof session.onboarded !== "undefined") {
          token.onboarded = Boolean(session.onboarded);
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.onboarded = Boolean(token.onboarded);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
