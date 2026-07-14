import { PrismaClient } from "@/generated/prisma";

/**
 * Prisma 客户端单例（防止开发环境热重载创建多个实例）
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * JSON 辅助函数 - 由于 SQLite 不支持原生 JSON 类型
 */
export function parseJsonField<T = Record<string, unknown>>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function stringifyJsonField(value: unknown): string {
  return JSON.stringify(value);
}
