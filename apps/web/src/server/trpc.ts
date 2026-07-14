import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * tRPC 上下文类型
 *
 * ownerId 由 protectedProcedure 中间件自动注入，
 * 下游路由无需重复查询 prisma.owner.findUnique。
 */
export interface TRPCContext {
  userId?: string;
  ownerId?: string;
  headers: Headers;
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

  // 自动注入 ownerId，避免每个端点重复查询
  const owner = await prisma.owner.findUnique({
    where: { userId: ctx.userId },
    select: { id: true },
  });

  return opts.next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      ownerId: owner?.id,
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

    const owner = await prisma.owner.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!owner) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "经营者信息不存在",
      });
    }

    const project = await prisma.project.findFirst({
      where: { id: input.projectId, ownerId: owner.id },
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
        ownerId: owner.id,
        project,
      },
    });
  });
