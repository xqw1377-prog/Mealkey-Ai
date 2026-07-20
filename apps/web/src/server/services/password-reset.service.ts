import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function appBaseUrl() {
  const raw =
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function buildResetPasswordUrl(token: string) {
  return `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function issuePasswordResetToken(
  prisma: PrismaClient,
  input: {
    email: string;
    requestedFrom: "forgot" | "admin";
  },
): Promise<{
  issued: boolean;
  resetUrl?: string;
  expiresAt?: string;
  userId?: string;
}> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { issued: false };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  if (!user?.passwordHash) {
    return { issued: false };
  }

  // 作废未使用旧票
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      requestedFrom: input.requestedFrom,
    },
  });

  return {
    issued: true,
    resetUrl: buildResetPasswordUrl(token),
    expiresAt: expiresAt.toISOString(),
    userId: user.id,
  };
}

export async function consumePasswordResetToken(
  prisma: PrismaClient,
  input: { token: string; newPassword: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = input.token.trim();
  if (!token) return { ok: false, error: "重置链接无效" };

  const password = input.newPassword;
  if (password.length < 8 || password.length > 128) {
    return { ok: false, error: "密码至少 8 位" };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, error: "密码需同时包含字母和数字" };
  }

  const tokenHash = hashToken(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "重置链接无效或已过期，请重新申请" };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
