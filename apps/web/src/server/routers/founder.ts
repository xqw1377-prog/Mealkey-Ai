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
import { projectStartMeetingPayload, runFounderLoop, persistFounderMemoryWrites } from "@/server/founder-layer";

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

      const runtime = await runFounderLoop({
        request: buildFounderLoopRequest({
          project,
          userId: ctx.userId!,
          message: input.question,
          companyContext,
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
});
