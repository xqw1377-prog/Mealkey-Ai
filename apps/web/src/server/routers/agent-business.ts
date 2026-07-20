/**
 * M-BIZ 商业模式 Agent Procedures
 * 从 agent.ts 拆分
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import {
  buildBusinessSnapshotFromChat,
  snapshotFromProjectBusinessProfile,
} from "@/lib/business";
import { buildBusinessProtocolProjection } from "@/lib/runtime-projections/businessProtocol";
import { safeParseJson } from "@mealkey/agent-sdk";
import {
  authorizeAgentCapability,
  failCapabilityConsumption,
  settleCapabilityConsumption,
} from "@/server/services/consumption.service";
import {
  mbizAnalyze,
  mbizChat,
  mbizGetSession,
  mbizScan,
  mbizVerify,
  mbizDegradedResponse,
  normalizeBizIndustry,
  normalizeBizStage,
} from "@/server/services/m-biz-client";
import { withFounderBusinessContext } from "@/lib/founder-decision-snapshot";
import { ensureProjectionStringArray } from "./agent-common";

function normalizeBizChatData(data: Record<string, unknown>) {
  return {
    sessionId:
      (typeof data.session_id === "string" && data.session_id) ||
      (typeof data.sessionId === "string" && data.sessionId) || "",
    status:
      (typeof data.status === "string" && data.status) || "idle",
    currentLayer:
      (typeof data.current_layer === "string" && data.current_layer) ||
      (typeof data.currentLayer === "string" && data.currentLayer) || "L1",
    reply: (typeof data.reply === "string" && data.reply) || "",
    pendingQuestions: ensureProjectionStringArray(data.pending_questions || data.pendingQuestions),
    factNodes: Array.isArray(data.fact_nodes)
      ? data.fact_nodes.map((item) => {
          const node = item as Record<string, unknown>;
          return {
            nodeId: String(node.node_id || node.nodeId || ""),
            category: String(node.category || ""),
            statement: String(node.statement || ""),
            confidence: typeof node.confidence === "number" ? node.confidence : 0.6,
            source: String(node.source || ""),
            needsVerification: Boolean(node.needs_verification ?? node.needsVerification),
            verificationStatus: String(node.verification_status || node.verificationStatus || "unverified"),
            followUpQuestions: ensureProjectionStringArray(node.follow_up_questions || node.followUpQuestions),
            createdAt: typeof node.created_at === "string" ? node.created_at : undefined,
          };
        })
      : [],
    dimensionScores:
      data.dimension_scores && typeof data.dimension_scores === "object"
        ? Object.fromEntries(
            Object.entries(data.dimension_scores as Record<string, unknown>).flatMap(([key, value]) => {
              if (!value || typeof value !== "object") return [];
              const item = value as Record<string, unknown>;
              if (typeof item.score !== "number" || typeof item.summary !== "string") return [];
              return [[key, { score: item.score, summary: item.summary }]];
            }),
          )
        : undefined,
    ruleJudgments: Array.isArray(data.rule_judgments)
      ? data.rule_judgments.map((item) => {
          const judgment = item as Record<string, unknown>;
          return {
            ruleId: String(judgment.rule_id || judgment.ruleId || ""),
            domain: String(judgment.domain || ""),
            inputFactIds: ensureProjectionStringArray(judgment.input_fact_ids || judgment.inputFactIds),
            conclusion: String(judgment.conclusion || ""),
            confidence: typeof judgment.confidence === "number" ? judgment.confidence : 0.6,
            severity: String(judgment.severity || "info"),
          };
        })
      : [],
    suggestions: Array.isArray(data.suggestions)
      ? data.suggestions.map((item) => {
          const suggestion = item as Record<string, unknown>;
          return {
            suggestionId: String(suggestion.suggestion_id || suggestion.suggestionId || ""),
            priority: String(suggestion.priority || "medium"),
            dimension: String(suggestion.dimension || ""),
            action: String(suggestion.action || ""),
            expectedImpact: typeof suggestion.expected_impact === "string" ? suggestion.expected_impact : "",
            verificationAction: typeof suggestion.verification_action === "string" ? suggestion.verification_action : "",
            estimatedVerificationPeriod: typeof suggestion.estimated_verification_period === "string"
              ? suggestion.estimated_verification_period : "",
          };
        })
      : [],
    verificationTasks: Array.isArray(data.verification_tasks)
      ? data.verification_tasks.map((item) => {
          const task = item as Record<string, unknown>;
          return {
            taskId: String(task.task_id || task.taskId || ""),
            sourceSuggestionId: String(task.source_suggestion_id || task.sourceSuggestionId || ""),
            dimension: String(task.dimension || ""),
            verificationAction: String(task.verification_action || task.verificationAction || ""),
            estimatedPeriod: typeof task.estimated_period === "string" ? task.estimated_period : "",
            status: String(task.status || "unverified"),
            createdAt: typeof task.created_at === "string" ? task.created_at : undefined,
            deadline: typeof task.deadline === "string" ? task.deadline : null,
            reminderSchedule: ensureProjectionStringArray(task.reminder_schedule || task.reminderSchedule),
          };
        })
      : [],
    progress: typeof data.progress === "number" ? data.progress : 0,
  };
}

function deriveBizHealthScore(normalized: {
  dimensionScores?: Record<string, { score: number; summary: string }>;
}) {
  const scores = normalized.dimensionScores ? Object.values(normalized.dimensionScores) : [];
  if (scores.length === 0) return undefined;
  return Math.round((scores.reduce((sum, item) => sum + item.score, 0) / scores.length / 5) * 100);
}

async function persistBizSnapshot(
  project: { id: string; profile: string | null },
  snapshot: ReturnType<typeof buildBusinessSnapshotFromChat>,
) {
  const { updateProjectProfile } = await import("@/server/services/project-profile");
  await updateProjectProfile(project.id, (profile) => {
    const current = profile.mBiz && typeof profile.mBiz === "object" ? profile.mBiz : null;
    const history = Array.isArray(profile.mBizHistory)
      ? (profile.mBizHistory as unknown[])
      : [];
    const nextProfileBase: Record<string, unknown> = {
      ...profile,
      mBiz: { ...snapshot, updatedAt: new Date().toISOString() },
      mBizPrevious: current || profile.mBizPrevious || null,
      mBizHistory: [current, ...history].filter(Boolean).slice(0, 6),
    };
    return withFounderBusinessContext(
      nextProfileBase,
      {
        decisionId: snapshot.sessionId,
        modelHealthScore: deriveBizHealthScore(snapshot.pageOutput),
        finalJudgement: snapshot.oneLiner,
        handoffPayload: {
          sessionId: snapshot.sessionId,
          currentLayer: snapshot.pageOutput.currentLayer,
        },
      },
      project.id,
    );
  });
}

export function createBusinessProcedures() {
  return {
    bizMeta: protectedProcedure.query(() => ({
      agentId: "m-biz",
      name: "商业模式工作台",
      version: "1.0.0",
      description: "围绕认知链、九维评分、策略建议和验证动作展开商业模式判断。",
      capabilities: ["认知链扫描", "九维健康度判断", "规则明细", "策略建议", "验证动作回注"],
      steps: [
        { id: "l1", name: "事实收集", type: "analysis" },
        { id: "l2", name: "规则判断", type: "analysis" },
        { id: "l3", name: "交叉分析", type: "analysis" },
        { id: "l4", name: "策略建议", type: "decision" },
        { id: "l5", name: "验证回注", type: "verification" },
      ],
    })),

    latestBusiness: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.ownerId) return null;
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
        });
        if (!project) return null;

        const profile =
          (safeParseJson(project.profile) as Record<string, unknown> | null) || {};
        return snapshotFromProjectBusinessProfile(profile);
      }),

    businessContext: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.ownerId) {
          return { current: null, previous: null, history: [] as unknown[], pageOutput: null, protocolProjection: null };
        }

        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
        });
        if (!project) {
          return { current: null, previous: null, history: [] as unknown[], pageOutput: null, protocolProjection: null };
        }

        const profile =
          (safeParseJson(project.profile) as Record<string, unknown> | null) || {};
        const current = snapshotFromProjectBusinessProfile(profile);
        const previous =
          profile.mBizPrevious && typeof profile.mBizPrevious === "object"
            ? snapshotFromProjectBusinessProfile({ mBiz: profile.mBizPrevious })
            : null;
        const history = Array.isArray(profile.mBizHistory)
          ? (profile.mBizHistory as Record<string, unknown>[])
              .map((item) => snapshotFromProjectBusinessProfile({ mBiz: item }))
              .filter((item): item is NonNullable<typeof item> => Boolean(item))
          : [];
        const pageOutput = current?.pageOutput ?? null;
        const averageScore =
          pageOutput?.dimensionScores && Object.keys(pageOutput.dimensionScores).length > 0
            ? Object.values(pageOutput.dimensionScores).reduce((sum, item) => sum + item.score, 0) /
              Object.keys(pageOutput.dimensionScores).length
            : 0;
        const businessCard = {
          industry: project.category || "待补充",
          stage: project.stage || "待补充",
          customer: pageOutput?.factNodes?.[0]?.statement || current?.observation || "待补充",
          revenue: pageOutput?.suggestions?.[0]?.expectedImpact || current?.strategy ||
            `当前商业健康度 ${Math.round(averageScore) || "待评估"}`,
        };

        return {
          current,
          previous,
          history,
          pageOutput,
          protocolProjection: buildBusinessProtocolProjection({
            project: { name: project.name, category: project.category, stage: project.stage },
            snapshot: current,
            previous,
            history,
            pageOutput,
            suggestions: pageOutput?.suggestions ?? [],
            ruleJudgments: pageOutput?.ruleJudgments ?? [],
            verificationTasks: pageOutput?.verificationTasks ?? [],
            factNodes: pageOutput?.factNodes ?? [],
            businessCard,
          }),
        };
      }),

    bizSession: protectedProcedure
      .input(z.object({
        projectId: z.string(),
        sessionId: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
        });
        if (!project) return null;

        const profile =
          (safeParseJson(project.profile) as Record<string, unknown> | null) || {};
        const snapshot = snapshotFromProjectBusinessProfile(profile);
        const sessionId = input.sessionId || snapshot?.sessionId;
        if (!sessionId) return null;

        const data = await mbizGetSession(sessionId);
        return normalizeBizChatData(data as unknown as Record<string, unknown>);
      }),

    bizChat: protectedProcedure
      .input(z.object({
        projectId: z.string(),
        message: z.string().min(1),
        sessionId: z.string().optional(),
        mode: z.enum(["chat", "scan", "analyze"]).default("chat"),
        dimension: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.ownerId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "经营者信息不存在" });
        }

        let authorization: Awaited<ReturnType<typeof authorizeAgentCapability>> | null = null;
        try {
          authorization = await authorizeAgentCapability(prisma, {
            userId: ctx.userId,
            agentCode: "m-biz",
            reason: "M-BIZ 商业模式分析",
            metadata: { source: "agent.bizChat", mode: input.mode, dimension: input.dimension ?? null },
          });
        } catch (error) {
          throw new TRPCError({
            code: "PAYMENT_REQUIRED",
            message: error instanceof Error ? error.message : "当前经营点不足，请前往 /billing 充值经营点",
          });
        }

        try {
          const project = await prisma.project.findFirst({
            where: { id: input.projectId, ownerId: ctx.ownerId },
          });
          if (!project) {
            throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限访问" });
          }

          const request = {
            session_id: input.sessionId,
            message: input.message,
            enterprise_name: project.name,
            industry: normalizeBizIndustry(project.category),
            stage: normalizeBizStage(project.stage),
          };

          let response: Awaited<ReturnType<typeof mbizChat>>;
          try {
            response =
              input.mode === "scan"
                ? await mbizScan(request)
                : input.mode === "analyze"
                  ? await mbizAnalyze(input.dimension || "RS", request)
                  : await mbizChat(request);
          } catch (error) {
            console.warn("[M-BIZ] 服务调用失败，降级:", (error as Error)?.message);
            const degraded = mbizDegradedResponse(input.message);
            const normalized = normalizeBizChatData(degraded as unknown as Record<string, unknown>);
            const snapshot = buildBusinessSnapshotFromChat({
              message: input.message,
              response: normalized,
              updatedAt: new Date().toISOString(),
            });
            await persistBizSnapshot(project, snapshot);
            if (authorization) {
              await settleCapabilityConsumption(prisma, {
                recordId: authorization.recordId,
                actualAmount: authorization.estimatedCost,
                metadata: { source: "agent.bizChat", mode: input.mode, degraded: true },
              });
            }
            return normalized;
          }

          const normalized = normalizeBizChatData(response as unknown as Record<string, unknown>);
          const snapshot = buildBusinessSnapshotFromChat({
            message: input.message,
            response: normalized,
            updatedAt: new Date().toISOString(),
          });

          await persistBizSnapshot(project, snapshot);
          if (authorization) {
            await settleCapabilityConsumption(prisma, {
              recordId: authorization.recordId,
              actualAmount: authorization.estimatedCost,
              metadata: { source: "agent.bizChat", mode: input.mode, degraded: false },
            });
          }
          return normalized;
        } catch (error) {
          if (authorization) {
            await failCapabilityConsumption(prisma, {
              recordId: authorization.recordId,
              reason: "M-BIZ 分析失败，经营点已退回",
              metadata: { source: "agent.bizChat" },
            });
          }
          throw error;
        }
      }),

    bizVerify: protectedProcedure
      .input(z.object({
        projectId: z.string(),
        sessionId: z.string(),
        taskId: z.string(),
        result: z.enum(["pass", "partial_pass", "fail", "abandoned", "expired"]),
        actualData: z.record(z.unknown()).optional(),
        conclusion: z.string().optional(),
        userFeedback: z.string().optional(),
        newInsights: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.ownerId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "经营者信息不存在" });
        }

        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
        });
        if (!project) {
          throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限访问" });
        }

        let response: Awaited<ReturnType<typeof mbizVerify>>;
        try {
          response = await mbizVerify({
            session_id: input.sessionId,
            task_id: input.taskId,
            result: input.result,
            actual_data: input.actualData,
            conclusion: input.conclusion,
            user_feedback: input.userFeedback,
            new_insights: input.newInsights,
          });
        } catch (error) {
          console.warn("[M-BIZ] verify 调用失败，降级:", (error as Error)?.message);
          const degraded = mbizDegradedResponse(input.conclusion || "商业模式验证");
          const normalized = normalizeBizChatData(degraded as unknown as Record<string, unknown>);
          const snapshot = buildBusinessSnapshotFromChat({
            message: input.conclusion || "商业模式验证已回注",
            response: normalized,
            updatedAt: new Date().toISOString(),
          });
          await persistBizSnapshot(project, snapshot);
          return normalized;
        }

        const normalized = normalizeBizChatData(response as unknown as Record<string, unknown>);
        const snapshot = buildBusinessSnapshotFromChat({
          message: input.conclusion || "商业模式验证已回注",
          response: normalized,
          updatedAt: new Date().toISOString(),
        });
        await persistBizSnapshot(project, snapshot);
        return normalized;
      }),
  };
}
