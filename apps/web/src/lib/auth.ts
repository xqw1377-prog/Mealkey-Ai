import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          const email = String(credentials.email).trim().toLowerCase();
          const password = String(credentials.password);

          const emailLimited = await rateLimit(
            `auth:login-email:${email}`,
            10,
            15 * 60 * 1000,
          );
          // fail-closed 时不拦登录（避免 Redis 故障把开发/单机登录打死）
          if (!emailLimited.ok && emailLimited.backend !== "fail-closed") {
            return null;
          }

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
        } catch (err) {
          console.error("[auth] authorize failed", err);
          return null;
        }
      },
    }),
  ],
});
