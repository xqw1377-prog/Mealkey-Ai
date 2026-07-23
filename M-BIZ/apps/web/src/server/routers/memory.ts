import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { safeParseJson } from "@mealkey/agent-sdk";

export const memoryRouter = router({
  // 获取项目记忆列表
  listByProject: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      type: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {

      // 通过 Owner 查找
      const owner = await prisma.owner.findUnique({ where: { userId: ctx.userId! } });
      if (!owner) return [];

      const project = await prisma.project.findFirst({
        where: { id: input.projectId, ownerId: owner.id },
        select: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "项目不存在或无权限" });
      }

      const memories = await prisma.memory.findMany({
        where: {
          ownerId: owner.id,
          projectId: input.projectId,
          ...(input.type ? { type: input.type } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      return memories.map(m => ({
        id: m.id,
        type: m.type,
        key: m.key,
        content: safeParseJson(m.content),
        source: m.source,
        importance: m.importance,
        createdAt: m.createdAt,
      }));
    }),

  // 获取用户记忆列表
  listByUser: protectedProcedure
    .input(z.object({
      type: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {

      const owner = await prisma.owner.findUnique({ where: { userId: ctx.userId! } });
      if (!owner) return [];

      const memories = await prisma.memory.findMany({
        where: {
          ownerId: owner.id,
          projectId: null,
          ...(input.type ? { type: input.type } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      return memories.map(m => ({
        id: m.id,
        type: m.type,
        key: m.key,
        content: safeParseJson(m.content),
        source: m.source,
        importance: m.importance,
        createdAt: m.createdAt,
      }));
    }),

  // 创建记忆
  create: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
      key: z.string(),
      value: z.unknown(),
      type: z.string().default("PROJECT"),
      source: z.string().default("user"),
      importance: z.number().min(0).max(100).default(50),
    }))
    .mutation(async ({ ctx, input }) => {

      const owner = await prisma.owner.findUnique({ where: { userId: ctx.userId! } });
      if (!owner) throw new TRPCError({ code: "NOT_FOUND", message: "经营者信息不存在" });

      if (input.projectId) {
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: owner.id },
          select: { id: true },
        });
        if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }

      const existing = await prisma.memory.findFirst({
        where: {
          ownerId: owner.id,
          projectId: input.projectId ?? null,
          key: input.key,
        },
        select: { id: true },
      });

      if (existing) {
        return prisma.memory.update({
          where: { id: existing.id },
          data: {
            content: JSON.stringify(input.value),
            source: input.source,
            importance: input.importance,
            type: input.type,
            projectId: input.projectId ?? null,
          },
        });
      }

      return prisma.memory.create({
        data: {
          ownerId: owner.id,
          projectId: input.projectId ?? null,
          key: input.key,
          content: JSON.stringify(input.value),
          source: input.source,
          importance: input.importance,
          type: input.type,
        },
      });
    }),

  // 删除记忆
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {

      const owner = await prisma.owner.findUnique({ where: { userId: ctx.userId! } });
      if (!owner) throw new TRPCError({ code: "NOT_FOUND", message: "经营者信息不存在" });

      return prisma.memory.deleteMany({
        where: { id: input.id, ownerId: owner.id },
      });
    }),

  // 获取项目决策历史
  decisions: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      type: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {

      const owner = await prisma.owner.findUnique({ where: { userId: ctx.userId! } });
      if (!owner) return [];

      const decisions = await prisma.decision.findMany({
        where: {
          ownerId: owner.id,
          projectId: input.projectId,
          ...(input.type ? { type: input.type } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      return decisions.map(d => ({
        id: d.id,
        type: d.type,
        problem: d.problem,
        observation: d.observation,
        diagnosis: d.diagnosis,
        judgement: d.judgement,
        strategy: d.strategy,
        action: d.action,
        confidence: d.confidence,
        evidence: safeParseJson(d.evidence),
        outcome: d.outcome ? safeParseJson(d.outcome) : null,
        learning: d.learning ? safeParseJson(d.learning) : null,
        createdAt: d.createdAt,
      }));
    }),
});
