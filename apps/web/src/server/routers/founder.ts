/**
 * Founder Layer tRPC — 会议编排薄封装（不改四 Agent 内核）
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import type { CompanyContext } from "@/server/founder";
import { buildFounderLoopRequest } from "@/server/founder/loop-request";
import { projectStartMeetingPayload, runFounderLoop, persistFounderMemoryWrites, generateDebateRound } from "@/server/founder-layer";
import { buildAssetContextBlock } from "@/server/services/asset.service";
import type { ExpertStatement } from "@/lib/meeting";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function contextFromProfile(
  project: { name: string; category: string | null; stage: string | null; profile: string | null },
): CompanyContext {
  const profile = validateProfile(project.profile) as Record<string, unknown>;
  return {
    brandName: asString(profile.brandName) || project.name,
    industry: asString(profile.category) || asString(profile.businessType) || project.category || "餐饮",
    storeCount: asString(profile.storeCount),
    city: asString(profile.city),
    stageLabel: asString(profile.stageLabel) || project.stage || undefined,
    currentChallenge: asString(profile.currentChallenge) || asString(profile.currentProblemTitle),
    yearlyGoal: asString(profile.yearlyGoal),
    strategicSummary: asString(profile.strategicSummary),
  };
}

export const founderRouter = router({
  /** 今日简报轻量别名（复用 dashboard 数据形态由前端继续用 getHome） */
  getBriefHint: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, name: true, category: true, stage: true, profile: true },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      const ctxCompany = contextFromProfile(project);
      return {
        companyId: project.id,
        brandName: ctxCompany.brandName,
        stageLabel: ctxCompany.stageLabel || "经营校准期",
        attention: ctxCompany.currentChallenge || "把当前问题压成一次可验证决策",
        suggestion: "召开战略评审会议",
        summary: ctxCompany.strategicSummary || `${ctxCompany.brandName} 正在形成第一版经营判断。`,
      };
    }),

  /**
   * 启动 Founder 会议：生成 Mission + 四席 ExpertOpinion（可降级）
   * 真实 Agent 流式仍走 /api/agent/stream；本接口保证会议桌立刻有纪要结构。
   */
  startMeeting: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        question: z.string().min(1).max(500),
        topic: z.string().max(500).optional(),
        assetIds: z.array(z.string()).max(12).optional(),
        agents: z
          .array(z.enum(["M-PNT", "M-MKT", "M-BIZ", "M-ED"]))
          .max(4)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: {
          id: true,
          name: true,
          category: true,
          stage: true,
          profile: true,
          ownerId: true,
        },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

      const companyContext = contextFromProfile(project);
      const meetingId = `mtg_${project.id.slice(-6)}_${Date.now().toString(36)}`;

      let assetContextBlock: string | undefined;
      if (input.assetIds?.length) {
        const assets = await prisma.asset.findMany({
          where: {
            id: { in: input.assetIds },
            ownerId: project.ownerId,
          },
          select: {
            title: true,
            kind: true,
            fileName: true,
            summary: true,
            transcript: true,
            extractedText: true,
            category: { select: { name: true } },
          },
          take: 12,
        });
        assetContextBlock = buildAssetContextBlock(assets) || undefined;
      }

      const runtime = await runFounderLoop({
        request: buildFounderLoopRequest({
          project,
          userId: ctx.userId!,
          message: input.question,
          companyContext,
          assetContextBlock,
        }),
        requiredAgents: input.agents,
      });

      await persistFounderMemoryWrites(prisma, project.ownerId, runtime.memoryWrites);

      const payload = projectStartMeetingPayload({
        meetingId,
        companyId: project.id,
        companyContext,
        runtime,
        topic: input.topic?.trim() || undefined,
      });

      return payload;
    }),

  /**
   * Founder Layer 最小闭环（契约层）：Mission → Adapters → Meeting → FinalDecision → MemoryWrites
   * 与 startMeeting 同源；本接口保留给联调与后续记忆落库。
   */
  runLoop: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        message: z.string().min(1).max(500),
        agents: z
          .array(z.enum(["M-PNT", "M-MKT", "M-BIZ", "M-ED"]))
          .max(4)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: {
          id: true,
          name: true,
          category: true,
          stage: true,
          profile: true,
          ownerId: true,
        },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

      const legacy = contextFromProfile(project);
      const result = await runFounderLoop({
        request: buildFounderLoopRequest({
          project,
          userId: ctx.userId!,
          message: input.message,
          companyContext: legacy,
        }),
        requiredAgents: input.agents,
      });

      await persistFounderMemoryWrites(prisma, project.ownerId, result.memoryWrites);

      return result;
    }),

  /**
   * 推进会议 Round2（挑战）/ Round3（收口）。
   * 有 LLM Key 时生成真辩论发言；否则回退 runtime 投影。
   */
  advanceRound: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        round: z.union([z.literal(2), z.literal(3)]),
        topic: z.string().min(1).max(500),
        focusChoice: z.string().max(200).optional().nullable(),
        previous: z
          .array(
            z.object({
              id: z.string(),
              roleId: z.string(),
              displayName: z.string(),
              round: z.union([z.literal(1), z.literal(2), z.literal(3)]),
              stance: z.enum(["support", "oppose", "conditional", "neutral"]),
              claim: z.string().max(300),
              reasons: z.array(z.string().max(300)).max(5),
              challengeTo: z.string().max(80).optional(),
            }),
          )
          .max(24),
        runtime: z.object({
          meeting: z.object({
            recommendation: z.string().optional(),
            conflicts: z
              .array(
                z.object({
                  conflictId: z.string(),
                  summary: z.string(),
                  sideA: z.string(),
                  sideB: z.string(),
                  dimension: z.string(),
                  agents: z.array(z.string()),
                }),
              )
              .max(8),
            rounds: z
              .array(
                z.object({
                  round: z.number(),
                  title: z.string(),
                  items: z
                    .array(
                      z.object({
                        agent: z.string(),
                        summary: z.string(),
                        stance: z.string().optional(),
                      }),
                    )
                    .max(8),
                }),
              )
              .max(6),
          }),
          decisions: z
            .array(
              z.object({
                decisionId: z.string(),
                sourceAgent: z.string(),
                judgement: z.string(),
                stance: z.string().optional(),
                risks: z.array(z.string()).max(6),
                nextSteps: z.array(z.string()).max(6),
              }),
            )
            .max(8),
          finalDecision: z.object({
            chosen: z.string(),
            problem: z.string(),
            reason: z.array(z.string()).max(8),
            validationPlan: z.array(z.string()).max(8),
          }),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

      const result = await generateDebateRound({
        round: input.round,
        topic: input.topic,
        focusChoice: input.focusChoice,
        previous: input.previous as ExpertStatement[],
        runtime: input.runtime,
      });

      return result;
    }),
});
