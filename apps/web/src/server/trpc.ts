import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * tRPC 上下文类型
 *
 * ownerId 优先由 createContext（HTTP 请求入口）解析；
 * protectedProcedure 仅在缺失时回查，避免每个 procedure 重复打 DB。
 */
export interface TRPCContext {
  userId?: string;
  ownerId?: string;
  headers: Headers;
}

async function resolveOwnerId(userId: string): Promise<string | null> {
  const owner = await prisma.owner.findUnique({
    where: { userId },
    select: { id: true },
  });
  return owner?.id ?? null;
}

/**
 * tRPC 初始化
 */
const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

// ─── Router & Procedure 基础导出 ───

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * 需要认证的 Procedure
 * 验证用户是否已登录，并自动注入 ownerId
 */
export const protectedProcedure = t.procedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "请先登录",
    });
  }

  const ownerId = ctx.ownerId ?? (await resolveOwnerId(ctx.userId));
  if (!ownerId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "经营者信息不存在，请先完成企业建档",
    });
  }

  return opts.next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      ownerId,
    },
  });
});

/**
 * 需要认证 + 项目权限的 Procedure
 * 自动验证 owner 和 project 归属，注入 ctx.ownerId 和 ctx.project
 */
export const protectedProjectProcedure = t.procedure
  .input(z.object({ projectId: z.string() }))
  .use(async (opts) => {
    const { ctx, input } = opts;

    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "请先登录",
      });
    }

    const ownerId = ctx.ownerId ?? (await resolveOwnerId(ctx.userId));
    if (!ownerId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "经营者信息不存在",
      });
    }

    const project = await prisma.project.findFirst({
      where: { id: input.projectId, ownerId },
      select: { id: true, name: true },
    });
    if (!project) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "项目不存在或无权限",
      });
    }

    return opts.next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
        ownerId,
        project,
      },
    });
  });
