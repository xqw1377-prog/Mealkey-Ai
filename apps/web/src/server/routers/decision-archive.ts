/**
 * Decision Archive Router — 决策档案 + 反馈闭环
 *
 * 职责：
 * 1. 获取项目的决策历史（含 AgentRun 元数据）
 * 2. 提交用户反馈（有用/没用），激活 LearningEngine
 * 3. 获取决策详情
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import { createDecision } from "@/server/services/agent-os.service";
import { buildGrowthPlan } from "@/lib/onboarding-interview";

export const decisionArchiveRouter = router({
  /** 会议「接受方案」→ 写入 Decision Memory（决策卡） */
  confirmFromMeeting: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        problem: z.string().min(1).max(500),
        judgement: z.string().min(1).max(1000),
        diagnosis: z.string().max(2000).optional(),
        observation: z.string().max(2000).optional(),
        strategy: z.string().max(2000).optional(),
        action: z.string().max(2000).optional(),
        confidence: z.number().min(0).max(1).default(0.72),
        validationPlan: z.string().max(500).optional(),
        supportClaims: z.array(z.string()).max(8).optional(),
        opposeClaims: z.array(z.string()).max(8).optional(),
        focusChoice: z.string().max(80).optional(),
        meetingTitle: z.string().max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        include: { owner: { select: { id: true } } },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

      const support = input.supportClaims ?? [];
      const oppose = input.opposeClaims ?? [];
      const evidence = [
        ...support.map((content) => ({
          source: "meeting:support",
          content,
          relevance: 0.8,
        })),
        ...oppose.map((content) => ({
          source: "meeting:oppose",
          content,
          relevance: 0.8,
        })),
      ];

      const record = await createDecision(prisma, {
        ownerId: project.owner.id,
        projectId: project.id,
        type: "meeting",
        problem: input.problem,
        observation: input.observation || `会议议题：${input.problem}`,
        diagnosis: input.diagnosis || (oppose[0] ? `主要分歧：${oppose[0]}` : "专家讨论后形成共识"),
        judgement: input.judgement,
        strategy: input.strategy || input.judgement,
        action: input.action || input.validationPlan || "按验证计划推进",
        confidence: input.confidence,
        evidence,
      });

      const growthPlan = buildGrowthPlan({
        judgement: input.judgement,
        action: input.action,
        problem: input.problem,
      });

      await prisma.decision.update({
        where: { id: record.id },
        data: {
          outcome: JSON.stringify({
            status: "validating",
            validationPlan: input.validationPlan || "90天验证",
            focusChoice: input.focusChoice || null,
            meetingTitle: input.meetingTitle || "咨询会议",
            supportCount: support.length,
            opposeCount: oppose.length,
            confirmedAt: new Date().toISOString(),
            growthPlan,
          }),
        },
      });

      {
        const prefs = validateProfile(project.profile);
        const nextProfile = {
          ...prefs,
          ...(input.focusChoice ? { founderPreference: input.focusChoice } : {}),
          lastMeetingDecisionId: record.id,
          lastMeetingAt: new Date().toISOString(),
          growthPlan,
        };
        await prisma.project.update({
          where: { id: project.id },
          data: { profile: JSON.stringify(nextProfile) },
        });
      }

      return { decisionId: record.id, growthPlan };
    }),

  /** 获取项目的决策历史列表 */
  list: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      limit: z.number().min(1).max(50).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

      const decisions = await prisma.decision.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: {
          agentRun: {
            select: {
              id: true,
              agentId: true,
              duration: true,
              tokens: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      const hasMore = decisions.length > input.limit;
      const items = hasMore ? decisions.slice(0, input.limit) : decisions;

      return {
        items: items.map(d => ({
          id: d.id,
          problem: d.problem,
          judgement: d.judgement,
          diagnosis: d.diagnosis,
          strategy: d.strategy,
          action: d.action,
          observation: d.observation,
          confidence: d.confidence,
          type: d.type,
          evidence: safeParseJsonArray(d.evidence),
          outcome: safeParseJson(d.outcome),
          learning: safeParseJson(d.learning),
          createdAt: d.createdAt,
          agentRun: d.agentRun ? {
            id: d.agentRun.id,
            agentId: d.agentRun.agentId,
            duration: d.agentRun.duration,
            tokens: d.agentRun.tokens,
            status: d.agentRun.status,
            createdAt: d.agentRun.createdAt,
          } : null,
        })),
        nextCursor: hasMore ? items[items.length - 1]?.id : null,
      };
    }),

  /** 获取单条决策详情 */
  get: protectedProcedure
    .input(z.object({ decisionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const decision = await prisma.decision.findFirst({
        where: { id: input.decisionId, owner: { userId: ctx.userId! } },
        include: {
          agentRun: {
            select: {
              id: true,
              agentId: true,
              duration: true,
              tokens: true,
              status: true,
              input: true,
              createdAt: true,
            },
          },
        },
      });

      if (!decision) throw new TRPCError({ code: "NOT_FOUND", message: "决策不存在或无权限" });

      return {
        id: decision.id,
        problem: decision.problem,
        observation: decision.observation,
        diagnosis: decision.diagnosis,
        judgement: decision.judgement,
        strategy: decision.strategy,
        action: decision.action,
        confidence: decision.confidence,
        type: decision.type,
        evidence: safeParseJsonArray(decision.evidence),
        outcome: safeParseJson(decision.outcome),
        learning: safeParseJson(decision.learning),
        createdAt: decision.createdAt,
        agentRun: decision.agentRun ? {
          id: decision.agentRun.id,
          agentId: decision.agentRun.agentId,
          duration: decision.agentRun.duration,
          tokens: decision.agentRun.tokens,
          status: decision.agentRun.status,
          input: decision.agentRun.input,
          createdAt: decision.agentRun.createdAt,
        } : null,
      };
    }),

  /** 提交反馈 — 激活学习引擎闭环，连接真实行动结果 */
  submitFeedback: protectedProcedure
    .input(z.object({
      decisionId: z.string(),
      helpful: z.boolean(),
      comment: z.string().max(500).optional(),
      /** aligned=符合预期 partial=方向对但需调整 off=偏离 */
      result: z.enum(["aligned", "partial", "off"]).optional(),
      progressNote: z.string().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const decision = await prisma.decision.findFirst({
        where: { id: input.decisionId, owner: { userId: ctx.userId! } },
        include: { project: true, owner: true },
      });
      if (!decision) throw new TRPCError({ code: "NOT_FOUND", message: "决策不存在或无权限" });

      const existingOutcome =
        typeof decision.outcome === "string"
          ? (safeParseJson(decision.outcome) as Record<string, unknown> | null)
          : decision.outcome && typeof decision.outcome === "object"
            ? (decision.outcome as Record<string, unknown>)
            : null;

      const result =
        input.result ||
        (input.helpful ? "aligned" : "off");
      const helpful = result === "off" ? false : input.helpful || result === "aligned" || result === "partial";
      const status =
        result === "aligned" ? "validated" : result === "partial" ? "adjusted" : "revisiting";

      const outcomeValue = {
        ...(existingOutcome ?? {}),
        helpful,
        result,
        status,
        comment: input.comment ?? existingOutcome?.comment ?? null,
        progressNote: input.progressNote ?? null,
        feedbackAt: new Date().toISOString(),
      };

      const score = result === "aligned" ? 0.9 : result === "partial" ? 0.65 : 0.3;
      const learningValue = {
        type:
          result === "aligned"
            ? "positive_feedback"
            : result === "partial"
              ? "partial_feedback"
              : "negative_feedback",
        summary:
          result === "aligned"
            ? `验证通过：${decision.judgement}`
            : result === "partial"
              ? `部分成立，需调整路径：${decision.problem}`
              : `验证偏离，建议召开跟进会议：${decision.problem}`,
        comment: input.comment ?? null,
        progressNote: input.progressNote ?? null,
        decisionId: input.decisionId,
        problem: decision.problem,
        judgement: decision.judgement,
        confidence: decision.confidence,
        score,
        result,
      };

      await prisma.decision.update({
        where: { id: input.decisionId },
        data: {
          outcome: JSON.stringify(outcomeValue),
          learning: JSON.stringify(learningValue),
        },
      });

      if (decision.projectId) {
        const project = await prisma.project.findUnique({
          where: { id: decision.projectId },
          select: { profile: true },
        });
        if (project) {
          const prefs = validateProfile(project.profile);
          const nextProfile = {
            ...prefs,
            lastValidationFeedback: {
              decisionId: decision.id,
              result,
              at: new Date().toISOString(),
              summary: learningValue.summary,
            },
            ...(result === "off"
              ? {
                  suggestedNextMeeting: {
                    topic: `复盘：${decision.problem}`,
                    reason: "上次决策验证偏离，建议第二次会议校准路径",
                  },
                }
              : {}),
          };
          await prisma.project.update({
            where: { id: decision.projectId },
            data: { profile: JSON.stringify(nextProfile) },
          });
        }
      }

      const owner = decision.owner;
      if (owner) {
        await prisma.memory.create({
          data: {
            ownerId: owner.id,
            projectId: decision.projectId,
            type: "LEARNING",
            key: `feedback_${decision.id}`,
            content: JSON.stringify({
              type: learningValue.type,
              problem: decision.problem,
              judgement: decision.judgement,
              comment: input.comment ?? null,
              progressNote: input.progressNote ?? null,
              result,
              confidence: decision.confidence,
              score,
              feedbackAt: new Date().toISOString(),
            }),
            source: "user_feedback",
            importance: result === "off" ? 90 : result === "partial" ? 75 : 70,
          },
        });

        if (result === "off") {
          await prisma.memory.create({
            data: {
              ownerId: owner.id,
              projectId: decision.projectId,
              type: "LEARNING",
              key: `lesson_from_feedback_${decision.id}`,
              content: JSON.stringify({
                problem: decision.problem,
                originalJudgement: decision.judgement,
                userFeedback: input.comment || "判断有偏差",
                confidence: decision.confidence,
                lesson: `用户反馈"${decision.problem}"的判断需要修正`,
              }),
              source: "learning_engine",
              importance: 90,
            },
          });
        }
      }

      return { success: true, result, status, learningSummary: learningValue.summary };
    }),

  /** 获取反馈统计数据 */
  stats: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const decisions = await prisma.decision.findMany({
        where: { projectId: input.projectId, owner: { userId: ctx.userId! } },
        select: {
          id: true,
          outcome: true,
          confidence: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const withFeedback = decisions.filter(d => d.outcome);
      const helpful = withFeedback.filter(d => {
        try { return JSON.parse(d.outcome!).helpful === true; }
        catch { return false; }
      });

      let pendingReview = 0;
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { profile: true },
      });
      if (project?.profile) {
        const profile = validateProfile(project.profile);
        pendingReview = Array.isArray(profile.positioningReviewQueue)
          ? profile.positioningReviewQueue.filter((i) => i.status === "pending").length
          : 0;
      }

      return {
        total: decisions.length,
        withFeedback: withFeedback.length,
        helpfulCount: helpful.length,
        helpfulRate: withFeedback.length > 0
          ? Math.round((helpful.length / withFeedback.length) * 100)
          : 0,
        avgConfidence: decisions.length > 0
          ? Math.round(decisions.reduce((s, d) => s + d.confidence, 0) / decisions.length * 100)
          : 0,
        pendingReview,
      };
    }),

  /** 定位变更后的复审队列 */
  reviewQueue: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { profile: true },
      });
      if (!project?.profile) return { items: [], pendingCount: 0 };

      const profile = validateProfile(project.profile);
      const items = Array.isArray(profile.positioningReviewQueue)
        ? profile.positioningReviewQueue
        : [];
      const pendingCount = items.filter((i) => i.status === "pending").length;
      return { items, pendingCount };
    }),

  /** 标记复审完成 / 忽略 — 使用事务保护 read-modify-write */
  resolveReview: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        decisionId: z.string(),
        status: z.enum(["dismissed", "reviewed"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await prisma.$transaction(async (tx) => {
        const project = await tx.project.findFirst({
          where: { id: input.projectId, owner: { userId: ctx.userId! } },
        });
        if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

        const profile = validateProfile(project.profile);
        const queue = Array.isArray(profile.positioningReviewQueue)
          ? profile.positioningReviewQueue
          : [];
        const nextQueue = queue.map((item) =>
          item.decisionId === input.decisionId
            ? { ...item, status: input.status, resolvedAt: new Date().toISOString() }
            : item,
        );
        profile.positioningReviewQueue = nextQueue;

        await tx.project.update({
          where: { id: project.id },
          data: { profile: JSON.stringify(profile) },
        });

        const decision = await tx.decision.findFirst({
          where: {
            id: input.decisionId,
            projectId: input.projectId,
            owner: { userId: ctx.userId! },
          },
        });
        if (decision?.outcome) {
          try {
            const outcome = JSON.parse(decision.outcome) as Record<string, unknown>;
            if (outcome.review && typeof outcome.review === "object") {
              outcome.review = {
                ...(outcome.review as Record<string, unknown>),
                needsReReview: false,
                status: input.status,
                resolvedAt: new Date().toISOString(),
              };
              await tx.decision.update({
                where: { id: decision.id },
                data: { outcome: JSON.stringify(outcome) },
              });
            }
          } catch {
            // ignore malformed outcome
          }
        }
      });

      return { success: true };
    }),
});

function safeParseJson(value: string | null | undefined): unknown {
  if (!value) return null;
  try { return JSON.parse(value); }
  catch { return null; }
}

function safeParseJsonArray(value: string | null | undefined): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
