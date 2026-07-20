/**
 * Restaurant Brain tRPC — 「我的餐厅」薄读模型 + 黄金场景种子
 * 不扩 Schema；不新建 Runtime / Agent。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import {
  createRestaurantBrainService,
  loadRestaurantBrainContext,
  seedExpansionScenarioFacts,
} from "@/server/restaurant-brain/service";
import { toUserFacingGapLabel } from "@/lib/i18n/user-facing";

async function requireOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, owner: { userId } },
    include: { owner: { select: { id: true } } },
  });
  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "项目不存在或无权限",
    });
  }
  return project;
}

export const restaurantBrainRouter = router({
  /** 我的餐厅总览（事实投影，非答案） */
  getOverview: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const project = await requireOwnedProject(ctx.userId!, input.projectId);
      const brain = createRestaurantBrainService(prisma);
      const snapshot = await brain.ensureByProject({
        projectId: project.id,
        ownerId: project.owner.id,
      });
      const context = await loadRestaurantBrainContext(prisma, {
        projectId: project.id,
        ownerId: project.owner.id,
      });

      return {
        restaurantId: snapshot.restaurant.id,
        name: snapshot.restaurant.name,
        understandingScore: snapshot.evolution.understandingScore,
        dataCompleteness: snapshot.evolution.dataCompleteness,
        decisionCount: snapshot.evolution.decisionCount,
        learningCount: snapshot.evolution.learningCount,
        profile: {
          category: context.identity.category,
          stage: context.identity.stage,
          storeCount: context.identity.storeCount,
          city: context.identity.city ?? null,
        },
        capability: {
          overall: context.capability.scores.overall,
          organization: context.capability.scores.organization,
          finance: context.capability.scores.finance,
          confidence: context.capability.confidence,
        },
        business: {
          netMargin: context.business.margin ?? null,
          monthlyRevenue: context.business.revenue ?? null,
        },
        founder: {
          decisionStyle: context.founder.style ?? null,
          riskPreference: context.founder.riskPreference ?? null,
        },
        unknowns: context.unknowns.map((u) => toUserFacingGapLabel(u)),
        priorBlock: context.priorBlock,
      };
    }),

  /** 兼容别名 → getOverview */
  getContext: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const project = await requireOwnedProject(ctx.userId!, input.projectId);
      const brain = createRestaurantBrainService(prisma);
      const snapshot = await brain.ensureByProject({
        projectId: project.id,
        ownerId: project.owner.id,
      });
      const context = await loadRestaurantBrainContext(prisma, {
        projectId: project.id,
        ownerId: project.owner.id,
      });
      return {
        restaurantId: snapshot.restaurant.id,
        name: snapshot.restaurant.name,
        understandingScore: snapshot.evolution.understandingScore,
        dataCompleteness: snapshot.evolution.dataCompleteness,
        decisionCount: snapshot.evolution.decisionCount,
        learningCount: snapshot.evolution.learningCount,
        context,
      };
    }),

  /** 决策历史（Brain DecisionRecord，可挂 mkDecisionId） */
  listDecisions: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        take: z.number().int().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await requireOwnedProject(ctx.userId!, input.projectId);
      const brain = createRestaurantBrainService(prisma);
      const snapshot = await brain.ensureByProject({
        projectId: project.id,
        ownerId: project.owner.id,
      });
      const items = await brain.listDecisionHistory(
        snapshot.restaurant.id,
        input.take ?? 20,
      );
      const decisions = items.map((d) => ({
        id: d.id,
        mkDecisionId: d.mkDecisionId,
        question: d.question,
        chosenOption: d.chosenOption,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
      }));
      return {
        restaurantId: snapshot.restaurant.id,
        decisions,
        items: decisions,
      };
    }),

  /** BrainEvent 最近事件（复盘用） */
  listEvents: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        take: z.number().int().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await requireOwnedProject(ctx.userId!, input.projectId);
      const brain = createRestaurantBrainService(prisma);
      const snapshot = await brain.ensureByProject({
        projectId: project.id,
        ownerId: project.owner.id,
      });
      const events = await prisma.brainEvent.findMany({
        where: { restaurantId: snapshot.restaurant.id },
        orderBy: { createdAt: "desc" },
        take: input.take ?? 20,
        select: {
          id: true,
          type: true,
          source: true,
          payloadJson: true,
          createdAt: true,
        },
      });
      return {
        restaurantId: snapshot.restaurant.id,
        events: events.map((e) => ({
          id: e.id,
          type: e.type,
          source: e.source,
          payload: (() => {
            try {
              return JSON.parse(e.payloadJson) as Record<string, unknown>;
            } catch {
              return {};
            }
          })(),
          createdAt: e.createdAt.toISOString(),
        })),
      };
    }),

  /**
   * 黄金场景演示种子（只填已有字段）
   * 「一家店 · 要不要开第二家」
   */
  seedGoldenScenario: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const project = await requireOwnedProject(ctx.userId!, input.projectId);
      const { restaurantId } = await seedExpansionScenarioFacts(prisma, {
        projectId: project.id,
        ownerId: project.owner.id,
      });
      return {
        ok: true as const,
        restaurantId,
        hint: "已写入扩张场景演示事实（组织 55 / 净利 8% / 历史扩张失败）。可开会问：要不要开第二家店？",
      };
    }),

  /** 兼容别名 */
  seedExpansionScenario: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const project = await requireOwnedProject(ctx.userId!, input.projectId);
      const { restaurantId } = await seedExpansionScenarioFacts(prisma, {
        projectId: project.id,
        ownerId: project.owner.id,
      });
      return {
        ok: true as const,
        restaurantId,
        message: "已写入扩张场景演示事实（组织 55 / 净利 8% / 历史扩张失败）",
        hint: "已写入扩张场景演示事实（组织 55 / 净利 8% / 历史扩张失败）。可开会问：要不要开第二家店？",
      };
    }),
});
