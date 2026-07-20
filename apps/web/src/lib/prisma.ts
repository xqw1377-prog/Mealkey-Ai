import fs from "fs";
import path from "path";

import { PrismaClient } from "@/generated/prisma";

/**
 * Prisma 客户端单例（防止开发环境热重载创建多个实例）
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl(rawUrl: string | undefined) {
  if (!rawUrl?.startsWith("file:./")) return rawUrl;

  const relativePath = rawUrl.slice("file:".length);
  const normalizedRelative = relativePath.replace(/^\.[\\/]/, "");
  const candidates = [
    path.resolve(process.cwd(), normalizedRelative),
    path.resolve(process.cwd(), "apps/web", normalizedRelative),
  ];
  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  const resolved = existing ?? candidates[0];

  return `file:${resolved.replace(/\\/g, "/")}`;
}

const resolvedDatabaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: resolvedDatabaseUrl
      ? {
          db: {
            url: resolvedDatabaseUrl,
          },
        }
      : undefined,
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
