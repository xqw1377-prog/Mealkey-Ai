/**
 * project.profile 乐观并发写
 * 用 updatedAt 做 CAS，避免读-改-写互相覆盖。
 */
import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@/generated/prisma";
import { prisma as defaultPrisma, stringifyJsonField } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";

type Db = PrismaClient | Prisma.TransactionClient;

export type ProfileMutator = (
  current: Record<string, unknown>,
) => Record<string, unknown> | null | undefined;

export class ProfileConflictError extends Error {
  constructor(message = "项目资料正在被其他操作更新，请重试") {
    super(message);
    this.name = "ProfileConflictError";
  }
}

export async function updateProjectProfile(
  projectId: string,
  mutator: ProfileMutator,
  opts?: {
    ownerId?: string;
    prisma?: Db;
    maxRetries?: number;
    extraData?: (
      current: Record<string, unknown>,
      next: Record<string, unknown>,
    ) => Prisma.ProjectUpdateManyMutationInput;
  },
): Promise<{ profile: Record<string, unknown>; updatedAt: Date } | null> {
  const db = opts?.prisma ?? defaultPrisma;
  const maxRetries = opts?.maxRetries ?? 3;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const row = await db.project.findFirst({
      where: {
        id: projectId,
        ...(opts?.ownerId ? { ownerId: opts.ownerId } : {}),
      },
      select: { id: true, profile: true, updatedAt: true },
    });
    if (!row) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "项目不存在或无权限",
      });
    }

    const current = validateProfile(row.profile) as Record<string, unknown>;
    const next = mutator(current);
    if (next == null) return null;

    const extra = opts?.extraData?.(current, next) ?? {};
    const result = await db.project.updateMany({
      where: {
        id: row.id,
        updatedAt: row.updatedAt,
      },
      data: {
        profile: stringifyJsonField(next),
        ...extra,
      },
    });

    if (result.count === 1) {
      const fresh = await db.project.findUnique({
        where: { id: row.id },
        select: { updatedAt: true },
      });
      return {
        profile: next,
        updatedAt: fresh?.updatedAt ?? new Date(),
      };
    }
  }

  throw new ProfileConflictError();
}

export function toProfileConflictTRPC(error: unknown): TRPCError | null {
  if (error instanceof ProfileConflictError) {
    return new TRPCError({ code: "CONFLICT", message: error.message });
  }
  return null;
}
