/**
 * Agent 公用类型和工具函数
 * 从 agent.ts 抽取
 */
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

/** 统一字符串数组规范化 */
export function ensureProjectionStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        return String(obj.summary ?? obj.content ?? obj.reason ?? obj.value ?? obj.text ?? obj.title ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

/** @deprecated 使用 ensureProjectionStringArray 替代 */
export function toStringArray(value: unknown): string[] {
  return ensureProjectionStringArray(value);
}

/** 通用对话 conversation + sendMessage procedures */
export function createConversationProcedures() {
  return {
    // 获取对话列表
    conversations: protectedProcedure
      .input(z.object({
        projectId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      }))
      .query(async ({ ctx, input }) => {
        return prisma.conversation.findMany({
          where: {
            userId: ctx.userId!,
            ...(input.projectId ? { projectId: input.projectId } : {}),
          },
          orderBy: { updatedAt: "desc" },
          take: input.limit,
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        });
      }),

    // 获取对话详情
    conversation: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        return prisma.conversation.findFirst({
          where: {
            id: input.id,
            userId: ctx.userId!,
          },
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
            },
          },
        });
      }),

    // 发送消息（返回流式响应的 conversationId）
    sendMessage: protectedProcedure
      .input(z.object({
        projectId: z.string(),
        message: z.string().min(1),
        conversationId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.ownerId) {
          const { TRPCError } = await import("@trpc/server");
          throw new TRPCError({ code: "NOT_FOUND", message: "经营者信息不存在" });
        }

        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
          select: { id: true },
        });
        if (!project) {
          const { TRPCError } = await import("@trpc/server");
          throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
        }

        let conversation;
        if (input.conversationId) {
          conversation = await prisma.conversation.findFirst({
            where: {
              id: input.conversationId,
              userId: ctx.userId!,
              projectId: input.projectId,
            },
          });
        }

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              userId: ctx.userId!,
              projectId: input.projectId,
              title: input.message.slice(0, 50),
            },
          });
        }

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "user",
            content: input.message,
          },
        });

        return { conversationId: conversation.id };
      }),
  };
}

/**
 * 工厂：生成 agent 元信息、历史、报告、上下文、反馈 五件套
 * 减少 agent.ts 中大量重复的 procedure 定义
 */
export function makeAgentDomainProcedures(domain: {
  id: string;
  agentId: string;
  manifest: { id: string; name: string; version: string; description: string; capabilities: string[] };
  steps: Array<{ id: string; name: string; type: string }>;
  saveFeedback: (prisma: unknown, input: { ownerId: string; decisionId: string; helpful: boolean; comment?: string; projectId: string }) => Promise<unknown>;
}) {
  return {
    // 产品元信息
    [`${domain.id}Meta`]: protectedProcedure.query(() => ({
      agentId: domain.manifest.id,
      name: domain.manifest.name,
      version: domain.manifest.version,
      description: domain.manifest.description,
      capabilities: domain.manifest.capabilities,
      steps: domain.steps,
    })),

    // 决策历史
    [`${domain.id}History`]: protectedProcedure
      .input(z.object({
        projectId: z.string(),
        limit: z.number().min(1).max(50).default(10),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.ownerId) return [];
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
          select: { id: true },
        });
        if (!project) return [];

        return prisma.decision.findMany({
          where: {
            ownerId: ctx.ownerId,
            projectId: input.projectId,
            OR: [{ type: domain.id }, { agentId: domain.agentId }],
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        });
      }),

    // 报告列表
    [`${domain.id}Reports`]: protectedProcedure
      .input(z.object({
        projectId: z.string(),
        limit: z.number().min(1).max(20).default(5),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.ownerId) return [];
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
          select: { id: true },
        });
        if (!project) return [];

        return prisma.report.findMany({
          where: { projectId: input.projectId, type: domain.id },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        });
      }),

    // 反馈
    [`${domain.id}Feedback`]: protectedProcedure
      .input(z.object({
        decisionId: z.string(),
        projectId: z.string(),
        helpful: z.boolean(),
        comment: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.ownerId) {
          const { TRPCError } = await import("@trpc/server");
          throw new TRPCError({ code: "NOT_FOUND", message: "经营者信息不存在" });
        }
        await domain.saveFeedback(prisma, {
          ownerId: ctx.ownerId,
          decisionId: input.decisionId,
          helpful: input.helpful,
          comment: input.comment,
          projectId: input.projectId,
        });
        return { ok: true };
      }),
  };
}
