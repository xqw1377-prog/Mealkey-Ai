import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { mPntWorkflow, mPntManifest, readStructured } from "@mealkey/agents";
import {
  buildPositioningSnapshot,
  diffPositioningSnapshots,
  snapshotFromMPntBlob,
  snapshotFromProjectProfile,
} from "@/lib/positioning";
import {
  buildEquitySnapshot,
  snapshotFromMEDBlob,
  snapshotFromProjectEquityProfile,
} from "@/lib/equity";
import {
  buildMarketSnapshot,
  snapshotFromMMktBlob,
  snapshotFromProjectMarketProfile,
} from "@/lib/market";
import {
  getFounderDecisionSnapshot,
  withFounderBusinessContext,
} from "@/lib/founder-decision-snapshot";
import {
  buildBusinessSnapshotFromChat,
  snapshotFromProjectBusinessProfile,
} from "@/lib/business";
import { buildBusinessProtocolProjection } from "@/lib/runtime-projections/businessProtocol";
import { buildEquityProtocolProjection } from "@/lib/runtime-projections/equityProtocol";
import { buildMarketProtocolProjection } from "@/lib/runtime-projections/marketProtocol";
import { buildPositioningProtocolProjection } from "@/lib/runtime-projections/positioningProtocol";
import { assertAgentQuota } from "@/server/services/billing.service";
import { safeParseJson } from "@mealkey/agent-sdk";
import { savePositioningFeedback } from "@/server/services/m-pnt.service";
import { mEdManifest, saveEquityFeedback } from "@/server/services/m-ed.service";
import { mMktManifest, saveMarketFeedback } from "@/server/services/m-mkt.service";
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

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeBizChatData(data: Record<string, unknown>) {
  return {
    sessionId:
      (typeof data.session_id === "string" && data.session_id) ||
      (typeof data.sessionId === "string" && data.sessionId) ||
      "",
    status:
      (typeof data.status === "string" && data.status) || "idle",
    currentLayer:
      (typeof data.current_layer === "string" && data.current_layer) ||
      (typeof data.currentLayer === "string" && data.currentLayer) ||
      "L1",
    reply: (typeof data.reply === "string" && data.reply) || "",
    pendingQuestions: toStringArray(data.pending_questions || data.pendingQuestions),
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
            followUpQuestions: toStringArray(node.follow_up_questions || node.followUpQuestions),
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
            inputFactIds: toStringArray(judgment.input_fact_ids || judgment.inputFactIds),
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
            expectedImpact:
              typeof suggestion.expected_impact === "string" ? suggestion.expected_impact : "",
            verificationAction:
              typeof suggestion.verification_action === "string" ? suggestion.verification_action : "",
            estimatedVerificationPeriod:
              typeof suggestion.estimated_verification_period === "string"
                ? suggestion.estimated_verification_period
                : "",
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
            estimatedPeriod:
              typeof task.estimated_period === "string" ? task.estimated_period : "",
            status: String(task.status || "unverified"),
            createdAt: typeof task.created_at === "string" ? task.created_at : undefined,
            deadline: typeof task.deadline === "string" ? task.deadline : null,
            reminderSchedule: toStringArray(task.reminder_schedule || task.reminderSchedule),
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
  const { parseJsonField, stringifyJsonField } = await import("../../lib/prisma");
  const profile = (parseJsonField(project.profile) as Record<string, unknown> | null) || {};
  const current = profile.mBiz && typeof profile.mBiz === "object" ? profile.mBiz : null;
  const history = Array.isArray(profile.mBizHistory) ? (profile.mBizHistory as unknown[]) : [];
  const nextProfileBase: Record<string, unknown> = {
    ...profile,
    mBiz: {
      ...snapshot,
      updatedAt: new Date().toISOString(),
    },
    mBizPrevious: current || profile.mBizPrevious || null,
    mBizHistory: [current, ...history].filter(Boolean).slice(0, 6),
  };
  const nextProfile = withFounderBusinessContext(
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

  await prisma.project.update({
    where: { id: project.id },
    data: {
      profile: stringifyJsonField(nextProfile),
    },
  });
}

function buildMarketSignalsForProjection(snapshot: ReturnType<typeof snapshotFromProjectMarketProfile>) {
  if (!snapshot) return [];
  if (snapshot.pageOutput.gaps.length > 0) return snapshot.pageOutput.gaps;

  return [
    {
      title: "消费趋势变化",
      summary: snapshot.pageOutput.marketStructure.trendSummary,
      confidence: snapshot.pageOutput.scores.timing,
    },
    {
      title: "竞争空位判断",
      summary: snapshot.pageOutput.competition.homogenization,
      confidence: snapshot.pageOutput.scores.gap,
    },
  ];
}

function ensureProjectionStringArray(value: unknown): string[] {
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

function normalizePositioningMarketResearchForProjection(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  return {
    summary: raw.summary ? String(raw.summary) : raw.market_summary ? String(raw.market_summary) : undefined,
    opportunities: ensureProjectionStringArray(raw.opportunities ?? raw.opportunityGaps ?? raw.opportunity_gaps),
  };
}

function normalizePositioningCandidatesForProjection(value: unknown, snapshot: Record<string, any> | null) {
  if (Array.isArray(value) && value.length > 0) {
    return value.reduce<Array<{
      id: string;
      title: string;
      fit?: string;
      why?: string;
      risk?: string;
      tag?: string;
    }>>((acc, item, index) => {
      if (!item || typeof item !== "object") return acc;
      const obj = item as Record<string, unknown>;
      const title = String(obj.title ?? obj.name ?? obj.direction ?? obj.positioning ?? "").trim();
      if (!title) return acc;
      acc.push({
        id: String(obj.id ?? obj.code ?? `candidate-${index + 1}`),
        title,
        fit: obj.fit ? String(obj.fit) : obj.scenario ? String(obj.scenario) : undefined,
        why: obj.why ? String(obj.why) : obj.reason ? String(obj.reason) : undefined,
        risk: obj.risk ? String(obj.risk) : undefined,
        tag: obj.tag ? String(obj.tag) : index === 0 ? "优先方向" : "候选方向",
      });
      return acc;
    }, []);
  }
  if (!snapshot) return [];

  const derived = [
    {
      id: "current",
      title: snapshot.oneLiner,
      fit: snapshot.brandPositioning?.targetCustomers ?? "优先服务当前目标客群",
      why: snapshot.strategy ?? snapshot.diagnosis ?? "沿用当前定位主方向。",
      risk: snapshot.risks?.[0]?.risk ?? "仍需验证用户是否真正买单。",
      tag: "当前主方向",
    },
    snapshot.brandPositioning?.differentiation
      ? {
          id: "differentiation",
          title: `放大 ${snapshot.brandPositioning.differentiation}`,
          fit: snapshot.brandPositioning.priceRange ?? "适合当前价格带测试",
          why: snapshot.brandPositioning.differentiation,
          risk: snapshot.risks?.[1]?.risk ?? "如果差异点不被感知，传播会失焦。",
          tag: "差异化测试",
        }
      : null,
    snapshot.nextSteps?.[0]?.step
      ? {
          id: "execution",
          title: "先做小范围执行验证",
          fit: snapshot.nextSteps[0].timeline ?? "适合先做 30 天实验",
          why: snapshot.nextSteps[0].step,
          risk: snapshot.validation?.killCriteria?.[0] ?? "验证不足时不要直接放大投入。",
          tag: "执行验证",
        }
      : null,
  ].filter(Boolean);

  return derived.slice(0, 3) as Array<{
    id: string;
    title: string;
    fit?: string;
    why?: string;
    risk?: string;
    tag?: string;
  }>;
}

function normalizePositioningTheoryCardsForProjection(theoryViews: unknown, theorySummary: unknown) {
  const labelMap: Record<string, string> = {
    ries: "里斯视角",
    trout: "特劳特视角",
    ye_maozhong: "叶茂中视角",
  };
  const recommendMap: Record<string, string> = {
    strong_recommend: "强支持",
    recommend: "支持",
    weak_recommend: "保留",
    not_recommend: "反对",
  };

  if (theoryViews && typeof theoryViews === "object") {
    const raw = theoryViews as Record<string, unknown>;
    const cards = Object.entries(raw).reduce<Array<{
      key: string;
      label: string;
      preferred: string;
      recommend: string;
      reason?: string;
      attack?: string;
    }>>((acc, [key, value]) => {
      if (!value || typeof value !== "object") return acc;
      const obj = value as Record<string, unknown>;
      acc.push({
        key,
        label: labelMap[key] ?? key,
        preferred: String(obj.preferred ?? obj.direction ?? obj.summary ?? obj.positioning ?? "").trim(),
        recommend: String(obj.recommendation ?? obj.theory_recommend ?? obj.vote ?? "已评估"),
        reason: obj.reason
          ? String(obj.reason)
          : obj.support_reason
            ? String(obj.support_reason)
            : ensureProjectionStringArray(obj.reasons ?? obj.support_points)[0],
        attack: obj.attack
          ? String(obj.attack)
          : obj.challenge
            ? String(obj.challenge)
            : ensureProjectionStringArray(obj.attacks ?? obj.attack_points ?? obj.against)[0],
      });
      return acc;
    }, []);
    if (cards.length > 0) return cards;
  }

  return Object.entries((theorySummary as Record<string, any>) ?? {}).map(([key, value]) => ({
    key,
    label: labelMap[key] ?? key,
    preferred: value?.preferred ?? "本轮未形成清晰偏好",
    recommend: recommendMap[value?.theory_recommend ?? ""] ?? "已评估",
    reason: value?.preferred ? `更支持这条方向：${value.preferred}` : undefined,
  }));
}

export const agentRouter = router({
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
        throw new TRPCError({ code: "NOT_FOUND", message: "经营者信息不存在" });
      }

      const project = await prisma.project.findFirst({
        where: { id: input.projectId, ownerId: ctx.ownerId },
        select: { id: true },
      });
      if (!project) {
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

  /** M-PNT 产品元信息 */
  positioningMeta: protectedProcedure.query(() => {
    return {
      agentId: mPntManifest.id,
      name: mPntManifest.name,
      version: mPntManifest.version,
      description: mPntManifest.description,
      capabilities: mPntManifest.capabilities,
      steps: mPntWorkflow.steps.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
      })),
    };
  }),

  /** 项目下的定位决策历史 */
  positioningHistory: protectedProcedure
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
          OR: [
            { type: "positioning" },
            { agentId: "m-pnt" },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  /** 定位报告列表 */
  positioningReports: protectedProcedure
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
        where: {
          projectId: input.projectId,
          type: "positioning",
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  /**
   * 最新定位快照（优先 project.profile.mPnt，其次最近 positioning Decision）
   * 供 World / Positioning / Meeting 共用
   */
  latestPositioning: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.ownerId) return null;

      const project = await prisma.project.findFirst({
        where: { id: input.projectId, ownerId: ctx.ownerId },
      });
      if (!project) return null;

      const profile =
        (safeParseJson(project.profile) as Record<string, unknown> | null) ||
        {};
      const fromProfile = snapshotFromProjectProfile(profile, project.target);
      if (fromProfile?.source === "profile" && profile.mPnt) {
        return fromProfile;
      }

      const decision = await prisma.decision.findFirst({
        where: {
          ownerId: ctx.ownerId,
          projectId: input.projectId,
          OR: [{ type: "positioning" }, { agentId: "m-pnt" }],
        },
        orderBy: { createdAt: "desc" },
      });

      if (decision) {
        let structured: Record<string, unknown> | null = null;
        try {
          const evidence = JSON.parse(decision.evidence || "[]") as Array<{
            source?: string;
            content?: string;
          }>;
          const hit = evidence.find((e) => e.source === "structured");
          if (hit?.content) {
            structured = JSON.parse(hit.content) as Record<string, unknown>;
          }
        } catch {
          structured = null;
        }
        // readStructured-compatible fallback if evidence already MKDecision-like
        if (!structured) {
          try {
            structured =
              readStructured({
                id: decision.id,
                problem: decision.problem,
                observation: decision.observation,
                diagnosis: decision.diagnosis,
                judgement: decision.judgement,
                strategy: decision.strategy,
                action: decision.action,
                confidence: decision.confidence,
                evidence: JSON.parse(decision.evidence || "[]"),
              } as Parameters<typeof readStructured>[0]) ?? null;
          } catch {
            structured = null;
          }
        }

        return buildPositioningSnapshot({
          decisionId: decision.id,
          problem: decision.problem,
          observation: decision.observation,
          diagnosis: decision.diagnosis,
          judgement: decision.judgement,
          strategy: decision.strategy,
          action: decision.action,
          confidence: decision.confidence,
          structured,
          source: "decision",
          updatedAt: decision.createdAt.toISOString(),
        });
      }

      return fromProfile;
    }),

  /**
   * 用户对定位决策的反馈
   * 写入 memory LEARNING 层，下次定位时自动注入 prompt
   */
  positioningFeedback: protectedProcedure
    .input(z.object({
      decisionId: z.string(),
      projectId: z.string(),
      helpful: z.boolean(),
      comment: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.ownerId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "经营者信息不存在" });
      }

      await savePositioningFeedback(prisma, {
        ownerId: ctx.ownerId,
        decisionId: input.decisionId,
        helpful: input.helpful,
        comment: input.comment,
        projectId: input.projectId,
      });

      return { ok: true };
    }),

  /**
   * 定位上下文：当前 + 上一版 + diff
   * 供定位工作台变更对比、会议侧边栏使用
   */
  positioningContext: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.ownerId) {
        return { current: null, previous: null, diff: null, history: [] as unknown[], protocolProjection: null };
      }

      const project = await prisma.project.findFirst({
        where: { id: input.projectId, ownerId: ctx.ownerId },
      });
      if (!project) {
        return { current: null, previous: null, diff: null, history: [] as unknown[], protocolProjection: null };
      }

      const profile =
        (safeParseJson(project.profile) as Record<string, unknown> | null) ||
        {};
      const founderSnapshot = getFounderDecisionSnapshot(profile);
      const current =
        snapshotFromMPntBlob(
          profile.mPnt as Record<string, unknown> | undefined,
          "profile",
        ) || snapshotFromProjectProfile(profile, project.target);
      const latestMarket = snapshotFromProjectMarketProfile(profile);

      const previous =
        snapshotFromMPntBlob(
          (profile.mPntPrevious as Record<string, unknown> | undefined) ||
            undefined,
          "profile",
        ) || null;

      const history = Array.isArray(profile.mPntHistory)
        ? (profile.mPntHistory as Record<string, unknown>[])
            .map((b) => snapshotFromMPntBlob(b, "profile"))
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
        : [];

      const currentBlob =
        (profile.mPnt as Record<string, unknown> | undefined) || undefined;
      const pageOutput =
        currentBlob && typeof currentBlob.pageOutput === "object"
          ? currentBlob.pageOutput
          : currentBlob && typeof currentBlob.page_output === "object"
            ? currentBlob.page_output
            : null;
      const marketResearch =
        currentBlob && typeof currentBlob.marketResearch === "object"
          ? currentBlob.marketResearch
          : pageOutput && typeof (pageOutput as Record<string, unknown>).marketResearch === "object"
            ? (pageOutput as Record<string, unknown>).marketResearch
            : null;
      const candidates =
        Array.isArray(currentBlob?.candidates)
          ? currentBlob?.candidates
          : pageOutput && Array.isArray((pageOutput as Record<string, unknown>).candidates)
            ? (pageOutput as Record<string, unknown>).candidates
            : [];
      const theoryViews =
        currentBlob && typeof currentBlob.theoryViews === "object"
          ? currentBlob.theoryViews
          : null;
      const crossFire =
        currentBlob && typeof currentBlob.crossFire === "object"
          ? currentBlob.crossFire
          : pageOutput && typeof (pageOutput as Record<string, unknown>).crossFire === "object"
            ? (pageOutput as Record<string, unknown>).crossFire
            : null;
      const synthesis =
        currentBlob && typeof currentBlob.synthesis === "object"
          ? currentBlob.synthesis
          : pageOutput && typeof (pageOutput as Record<string, unknown>).synthesis === "object"
            ? (pageOutput as Record<string, unknown>).synthesis
            : null;
      const sharedMarketHandoff =
        founderSnapshot.marketContext?.handoffPayload &&
        typeof founderSnapshot.marketContext.handoffPayload === "object"
          ? {
              opportunityId: founderSnapshot.marketContext.opportunityId,
              handoffPayload: founderSnapshot.marketContext.handoffPayload,
              createdAt: founderSnapshot.marketContext.updatedAt,
            }
          : null;
      const profileMarketHandoff = latestMarket?.pageOutput.opportunityCard?.handoffPayload
        ? {
            opportunityId: latestMarket.pageOutput.opportunityCard.opportunityId,
            handoffPayload: latestMarket.pageOutput.opportunityCard.handoffPayload,
            createdAt: latestMarket.updatedAt,
          }
        : null;
      const reports = await prisma.report.findMany({
        where: {
          projectId: input.projectId,
          type: "positioning",
        },
        orderBy: { createdAt: "desc" },
        take: 2,
      });
      const normalizedMarketResearch = normalizePositioningMarketResearchForProjection(marketResearch);
      const normalizedCandidates = normalizePositioningCandidatesForProjection(candidates, current as Record<string, any> | null);
      const normalizedTheoryCards = normalizePositioningTheoryCardsForProjection(
        theoryViews,
        current?.theoryVoteSummary,
      );
      const protocolProjection = buildPositioningProtocolProjection({
        project: {
          name: project.name,
          category: project.category,
          city: project.city,
        },
        brandName:
          current?.brandPositioning?.brandName ??
          project.name,
        categoryName:
          current?.brandPositioning?.category ??
          project.category ??
          "",
        cityName: project.city ?? "",
        audience: current?.brandPositioning?.targetCustomers ?? "",
        differentiation: current?.brandPositioning?.differentiation ?? "",
        snapshot: current,
        leadCandidate: normalizedCandidates[0],
        history: history.map((item) => ({
          judgement: item.oneLiner,
          strategy: item.strategy,
          createdAt: item.updatedAt || new Date().toISOString(),
        })),
        reports: reports.map((item) => ({
          title: item.title,
          summary: item.summary,
        })),
        marketResearch: normalizedMarketResearch,
        theoryCards: normalizedTheoryCards,
        candidates: normalizedCandidates,
      });

      return {
        current,
        previous,
        diff: diffPositioningSnapshots(previous, current),
        history,
        pageOutput,
        marketResearch,
        candidates,
        theoryViews,
        crossFire,
        synthesis,
        marketHandoff: sharedMarketHandoff || profileMarketHandoff,
        protocolProjection,
      };
    }),

  /** M-MKT 产品元信息 */
  marketMeta: protectedProcedure.query(() => {
    return {
      agentId: mMktManifest.id,
      name: mMktManifest.name,
      version: mMktManifest.version,
      description: mMktManifest.description,
      capabilities: mMktManifest.capabilities,
      steps: [
        { id: "health", name: "机会评分", type: "analysis" },
        { id: "structure", name: "市场结构", type: "analysis" },
        { id: "gap", name: "空位判断", type: "analysis" },
        { id: "decision", name: "进入决策", type: "decision" },
      ],
    };
  }),

  marketHistory: protectedProcedure
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
          OR: [{ type: "market" }, { agentId: "m-mkt" }],
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  marketReports: protectedProcedure
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
        where: {
          projectId: input.projectId,
          type: "market",
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  latestMarket: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.ownerId) return null;

      const project = await prisma.project.findFirst({
        where: { id: input.projectId, ownerId: ctx.ownerId },
      });
      if (!project) return null;

      const profile =
        (safeParseJson(project.profile) as Record<string, unknown> | null) || {};
      const fromProfile = snapshotFromProjectMarketProfile(profile);
      if (fromProfile?.source === "profile" && profile.mMkt) {
        return fromProfile;
      }

      const decision = await prisma.decision.findFirst({
        where: {
          ownerId: ctx.ownerId,
          projectId: input.projectId,
          OR: [{ type: "market" }, { agentId: "m-mkt" }],
        },
        orderBy: { createdAt: "desc" },
      });
      if (!decision) return fromProfile;

      let structured: Record<string, unknown> | null = null;
      try {
        const evidence = JSON.parse(decision.evidence || "[]") as Array<{
          source?: string;
          content?: string;
        }>;
        const hit = evidence.find((item) => item.source === "structured");
        if (hit?.content) {
          structured = JSON.parse(hit.content) as Record<string, unknown>;
        }
      } catch {
        structured = null;
      }

      return buildMarketSnapshot({
        decisionId: decision.id,
        problem: decision.problem,
        observation: decision.observation,
        diagnosis: decision.diagnosis,
        judgement: decision.judgement,
        strategy: decision.strategy,
        action: decision.action,
        confidence: decision.confidence,
        structured,
        source: "decision",
        updatedAt: decision.createdAt.toISOString(),
      });
    }),

  marketFeedback: protectedProcedure
    .input(z.object({
      decisionId: z.string(),
      projectId: z.string(),
      helpful: z.boolean(),
      comment: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.ownerId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "经营者信息不存在" });
      }

      await saveMarketFeedback(prisma, {
        ownerId: ctx.ownerId,
        decisionId: input.decisionId,
        helpful: input.helpful,
        comment: input.comment,
        projectId: input.projectId,
      });

      return { ok: true };
    }),

  marketContext: protectedProcedure
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
      const current = snapshotFromProjectMarketProfile(profile);
      const previous =
        snapshotFromMMktBlob(
          (profile.mMktPrevious as Record<string, unknown> | undefined) || undefined,
          "profile",
        ) || null;
      const history = Array.isArray(profile.mMktHistory)
        ? (profile.mMktHistory as Record<string, unknown>[])
            .map((item) => snapshotFromMMktBlob(item, "profile"))
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
        : [];

      const currentBlob =
        (profile.mMkt as Record<string, unknown> | undefined) || undefined;
      const pageOutput =
        currentBlob && typeof currentBlob.pageOutput === "object"
          ? currentBlob.pageOutput
          : currentBlob && typeof currentBlob.page_output === "object"
            ? currentBlob.page_output
            : null;
      const reports = await prisma.report.findMany({
        where: {
          projectId: input.projectId,
          type: "market",
        },
        orderBy: { createdAt: "desc" },
        take: 2,
      });
      const protocolProjection = buildMarketProtocolProjection({
        project: {
          name: project.name,
          category: project.category,
          stage: project.stage,
        },
        snapshot: current,
        signals: buildMarketSignalsForProjection(current),
        history: history.map((item) => ({
          judgement: item.oneLiner,
          problem: item.problem,
          createdAt: item.updatedAt || new Date().toISOString(),
        })),
        reports: reports.map((item) => ({
          title: item.title,
          summary: item.summary,
        })),
      });

      return {
        current,
        previous,
        history,
        pageOutput,
        protocolProjection,
      };
    }),

  /** M-BIZ 产品元信息 */
  bizMeta: protectedProcedure.query(() => {
    return {
      agentId: "m-biz",
      name: "商业模式工作台",
      version: "1.0.0",
      description: "围绕认知链、九维评分、策略建议和验证动作展开商业模式判断。",
      capabilities: [
        "认知链扫描",
        "九维健康度判断",
        "规则明细",
        "策略建议",
        "验证动作回注",
      ],
      steps: [
        { id: "l1", name: "事实收集", type: "analysis" },
        { id: "l2", name: "规则判断", type: "analysis" },
        { id: "l3", name: "交叉分析", type: "analysis" },
        { id: "l4", name: "策略建议", type: "decision" },
        { id: "l5", name: "验证回注", type: "verification" },
      ],
    };
  }),

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
        customer:
          pageOutput?.factNodes?.[0]?.statement ||
          current?.observation ||
          "待补充",
        revenue:
          pageOutput?.suggestions?.[0]?.expectedImpact ||
          current?.strategy ||
          `当前商业健康度 ${Math.round(averageScore) || "待评估"}`,
      };
      const protocolProjection = buildBusinessProtocolProjection({
        project: {
          name: project.name,
          category: project.category,
          stage: project.stage,
        },
        snapshot: current,
        previous,
        history,
        pageOutput,
        suggestions: pageOutput?.suggestions ?? [],
        ruleJudgments: pageOutput?.ruleJudgments ?? [],
        verificationTasks: pageOutput?.verificationTasks ?? [],
        factNodes: pageOutput?.factNodes ?? [],
        businessCard,
      });

      return {
        current,
        previous,
        history,
        pageOutput,
        protocolProjection,
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

      try {
        await assertAgentQuota(prisma, ctx.userId, { agentCode: "m-biz" });
      } catch (error) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: error instanceof Error ? error.message : "未开通商业模式 Agent",
        });
      }

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
        // M-BIZ 服务不可用时，返回启发式降级回复
        console.warn("[M-BIZ] 服务调用失败，降级为启发式回复:", (error as Error)?.message);
        const degraded = mbizDegradedResponse(input.message);
        const normalized = normalizeBizChatData(degraded as unknown as Record<string, unknown>);
        const snapshot = buildBusinessSnapshotFromChat({
          message: input.message,
          response: normalized,
          updatedAt: new Date().toISOString(),
        });
        await persistBizSnapshot(project, snapshot);
        return normalized;
      }

      const normalized = normalizeBizChatData(response as unknown as Record<string, unknown>);
      const snapshot = buildBusinessSnapshotFromChat({
        message: input.message,
        response: normalized,
        updatedAt: new Date().toISOString(),
      });

      await persistBizSnapshot(project, snapshot);
      return normalized;
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

  /** M-ED 产品元信息 */
  equityMeta: protectedProcedure.query(() => {
    return {
      agentId: mEdManifest.id,
      name: mEdManifest.name,
      version: mEdManifest.version,
      description: mEdManifest.description,
      capabilities: mEdManifest.capabilities,
      steps: [
        { id: "health", name: "股权健康扫描", type: "analysis" },
        { id: "profile", name: "结构画像", type: "analysis" },
        { id: "scenario", name: "方案模拟", type: "simulation" },
        { id: "decision", name: "最终判断", type: "decision" },
      ],
    };
  }),

  equityHistory: protectedProcedure
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
          OR: [{ type: "equity" }, { agentId: "m-ed" }],
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  equityReports: protectedProcedure
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
        where: {
          projectId: input.projectId,
          type: "equity",
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  latestEquity: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.ownerId) return null;

      const project = await prisma.project.findFirst({
        where: { id: input.projectId, ownerId: ctx.ownerId },
      });
      if (!project) return null;

      const profile =
        (safeParseJson(project.profile) as Record<string, unknown> | null) || {};
      const fromProfile = snapshotFromProjectEquityProfile(profile);
      if (fromProfile?.source === "profile" && profile.mEd) {
        return fromProfile;
      }

      const decision = await prisma.decision.findFirst({
        where: {
          ownerId: ctx.ownerId,
          projectId: input.projectId,
          OR: [{ type: "equity" }, { agentId: "m-ed" }],
        },
        orderBy: { createdAt: "desc" },
      });
      if (!decision) return fromProfile;

      let structured: Record<string, unknown> | null = null;
      try {
        const evidence = JSON.parse(decision.evidence || "[]") as Array<{
          source?: string;
          content?: string;
        }>;
        const hit = evidence.find((item) => item.source === "structured");
        if (hit?.content) {
          structured = JSON.parse(hit.content) as Record<string, unknown>;
        }
      } catch {
        structured = null;
      }

      return buildEquitySnapshot({
        decisionId: decision.id,
        problem: decision.problem,
        observation: decision.observation,
        diagnosis: decision.diagnosis,
        judgement: decision.judgement,
        strategy: decision.strategy,
        action: decision.action,
        confidence: decision.confidence,
        structured,
        source: "decision",
        updatedAt: decision.createdAt.toISOString(),
      });
    }),

  equityFeedback: protectedProcedure
    .input(z.object({
      decisionId: z.string(),
      projectId: z.string(),
      helpful: z.boolean(),
      comment: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.ownerId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "经营者信息不存在" });
      }

      await saveEquityFeedback(prisma, {
        ownerId: ctx.ownerId,
        decisionId: input.decisionId,
        helpful: input.helpful,
        comment: input.comment,
        projectId: input.projectId,
      });

      return { ok: true };
    }),

  equityContext: protectedProcedure
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
      const current = snapshotFromProjectEquityProfile(profile);
      const previous =
        snapshotFromMEDBlob(
          (profile.mEdPrevious as Record<string, unknown> | undefined) || undefined,
          "profile",
        ) || null;
      const history = Array.isArray(profile.mEdHistory)
        ? (profile.mEdHistory as Record<string, unknown>[])
            .map((item) => snapshotFromMEDBlob(item, "profile"))
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
        : [];

      const currentBlob =
        (profile.mEd as Record<string, unknown> | undefined) || undefined;
      const pageOutput =
        currentBlob && typeof currentBlob.pageOutput === "object"
          ? currentBlob.pageOutput
          : currentBlob && typeof currentBlob.page_output === "object"
            ? currentBlob.page_output
            : null;
      const reports = await prisma.report.findMany({
        where: {
          projectId: input.projectId,
          type: "equity",
        },
        orderBy: { createdAt: "desc" },
        take: 2,
      });
      const protocolProjection = buildEquityProtocolProjection({
        project: {
          name: project.name,
          category: project.category,
          stage: project.stage,
        },
        snapshot: current,
        pageOutput: current?.pageOutput ?? null,
        previous,
        intake: {
          plan: "",
          concern: "",
          goal: "",
        },
        scenarios: current?.pageOutput.scenarios ?? [],
        history: history.map((item) => ({
          judgement: item.oneLiner,
          problem: item.problem,
          createdAt: item.updatedAt || new Date().toISOString(),
        })),
        reports: reports.map((item) => ({
          title: item.title,
          summary: item.summary,
        })),
        committee: current?.pageOutput.committee ?? [],
      });

      return {
        current,
        previous,
        history,
        pageOutput,
        protocolProjection,
      };
    }),
});
