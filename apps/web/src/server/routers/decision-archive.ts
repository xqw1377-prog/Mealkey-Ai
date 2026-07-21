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
import {
  createValidationPlanFromDecision,
  upsertValidationTask,
} from "@/server/founder-layer/validation";
import type { ValidationTask } from "@/server/founder-layer/contracts/validation";
import {
  buildPreferenceMemoryWrite,
  persistFounderMemoryWrites,
} from "@/server/founder-layer/memory";
import { approveDecisionContract } from "@/server/founder-layer/decision/contract-v2";
import {
  STATUS_LABEL,
  type FounderDecisionContract,
} from "@/server/founder-layer/contracts/decision-v2";
import { assertMeetingConfirmEvidence } from "@/server/founder-layer/evidence";
import { resolveActiveBrand } from "@/lib/brand-registry";
import {
  findConflictingOpenDecision,
  parseDecisionOutcome,
  problemFingerprint,
} from "@/server/founder-layer/decision/problem-fingerprint";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "@/server/services/project-profile";
import { buildTodayActionsFromMeetingConfirm } from "@/lib/meeting-today-actions";
import {
  emitDecisionRuntimeEvent,
  mergeMkStatusIntoOutcome,
} from "@/server/founder-layer/capability/decision/registry";
import { seedDecisionArtifactsFromMeeting } from "@/server/founder-layer/capability/decision/seed-from-meeting";
import { createExecutionFromDecision } from "@/server/founder-layer/capability/execution/create-from-decision";
import {
  buildCouncilDecisionSignals,
  ingestSignalsAndEvolve,
} from "@/server/founder-layer/intelligence";
// Case.id ≡ MKDecision.id：开会预创建 DRAFT 见 decision-council.open

function asTaskArray(raw: unknown): ValidationTask[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => item && typeof item === "object" && "id" in item) as ValidationTask[];
}

function clipJudgement(text: string, max = 140): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "已确认决策";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

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
        /** 会议共识的下一步动作列表（优先写入今日三动作） */
        nextActions: z.array(z.string().max(200)).max(6).optional(),
        confidence: z.number().min(0).max(1).default(0.72),
        validationPlan: z.string().max(500).optional(),
        supportClaims: z.array(z.string()).max(8).optional(),
        opposeClaims: z.array(z.string()).max(8).optional(),
        /** 四席意见（有则优先生成 DecisionOpinion） */
        expertOpinions: z
          .array(
            z.object({
              expert: z.enum(["M-PNT", "M-MKT", "M-BIZ", "M-ED"]),
              position: z.enum(["support", "oppose", "neutral"]),
              reason: z.string().min(1).max(400),
              confidence: z.number().min(0).max(1).optional(),
            }),
          )
          .max(8)
          .optional(),
        focusChoice: z.string().max(80).optional(),
        meetingTitle: z.string().max(120).optional(),
        parentEvidenceIds: z.array(z.string()).max(24).optional(),
        /** 调用方声明证据是否充分（与 parentEvidenceIds 二选一或并用） */
        evidenceSufficient: z.boolean().optional(),
        /** 证据不足时仍归档为「假设推进」 */
        allowInsufficientEvidence: z.boolean().optional(),
        /** 同题冲突时须显式指定被修订的旧决策 ID */
        supersedesDecisionId: z.string().optional(),
        /** Decision Contract V2 快照（可选；有则落库） */
        decisionContract: z.record(z.unknown()).optional(),
        /** 七常委 Decision Trace / Insight 摘要（写入 outcome） */
        councilTrace: z
          .object({
            caseId: z.string().optional(),
            sessionId: z.string().optional(),
            insightCount: z.number().int().nonnegative().optional(),
            recommendedAction: z.string().optional(),
            founderChoice: z
              .enum(["接受委员会", "修改方案", "推翻委员会"])
              .optional(),
            decisionTrace: z.unknown().optional(),
          })
          .optional(),
        /**
         * 开会时预创建的 DRAFT Decision.id（≡ caseId）
         * 有则更新该行，保证 Case.id ≡ MKDecision.id
         */
        draftDecisionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let confirmGate: { mode: "formal" | "hypothesis"; evidenceIds: string[] };
      try {
        confirmGate = assertMeetingConfirmEvidence({
          parentEvidenceIds: input.parentEvidenceIds,
          evidenceSufficient: input.evidenceSufficient,
          allowInsufficientEvidence: input.allowInsufficientEvidence,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "证据门禁未通过",
        });
      }

      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        include: { owner: { select: { id: true } } },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const brand = resolveActiveBrand(profile, project.name);
      const fingerprint = problemFingerprint(brand.id, input.problem);

      const recentDecisions = await prisma.decision.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          problem: true,
          judgement: true,
          outcome: true,
        },
      });

      const conflict = findConflictingOpenDecision({
        candidates: recentDecisions.map((d) => ({
          id: d.id,
          problem: d.problem,
          judgement: d.judgement,
          outcome: d.outcome,
        })),
        brandId: brand.id,
        problem: input.problem,
        judgement: input.judgement,
      });

      if (conflict) {
        if (
          !input.supersedesDecisionId ||
          input.supersedesDecisionId !== conflict.id
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `同题存在未归档旧判断，禁止悄悄漂移。请以修订案确认：supersedesDecisionId=${conflict.id}（旧判断：${conflict.judgement.slice(0, 60)}）`,
          });
        }
      }

      if (
        input.supersedesDecisionId &&
        !recentDecisions.some((d) => d.id === input.supersedesDecisionId)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "supersedesDecisionId 无效或不属于本项目",
        });
      }

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

      const gatedConfidence =
        confirmGate.mode === "hypothesis"
          ? Math.min(input.confidence, 0.55)
          : input.confidence;

      const observation =
        input.observation || `会议议题：${input.problem}`;
      const diagnosis =
        input.diagnosis ||
        (oppose[0] ? `主要分歧：${oppose[0]}` : "专家讨论后形成共识");
      const strategy = input.strategy || input.judgement;
      const action =
        input.action || input.validationPlan || "按验证计划推进";

      let record: { id: string };
      if (input.draftDecisionId) {
        const draft = await prisma.decision.findFirst({
          where: {
            id: input.draftDecisionId,
            projectId: project.id,
            ownerId: project.owner.id,
          },
        });
        if (!draft) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "draftDecisionId 无效或不属于本项目",
          });
        }
        record = await prisma.decision.update({
          where: { id: draft.id },
          data: {
            type: "meeting",
            problem: input.problem,
            observation,
            diagnosis,
            judgement: input.judgement,
            strategy,
            action,
            confidence: gatedConfidence,
            evidence: JSON.stringify(evidence),
          },
          select: { id: true },
        });
      } else {
        record = await createDecision(prisma, {
          ownerId: project.owner.id,
          projectId: project.id,
          type: "meeting",
          problem: input.problem,
          observation,
          diagnosis,
          judgement: input.judgement,
          strategy,
          action,
          confidence: gatedConfidence,
          evidence,
        });
      }

      if (input.supersedesDecisionId) {
        const old = recentDecisions.find((d) => d.id === input.supersedesDecisionId);
        if (old) {
          const oldOutcome = parseDecisionOutcome(old.outcome) || {};
          await prisma.decision.update({
            where: { id: old.id },
            data: {
              outcome: JSON.stringify({
                ...oldOutcome,
                status: "superseded",
                supersededBy: record.id,
                supersededAt: new Date().toISOString(),
              }),
            },
          });
        }
      }

      const growthPlan = buildGrowthPlan({
        judgement: input.judgement,
        action: input.action,
        problem: input.problem,
      });

      const contractHypothesis =
        input.decisionContract &&
        typeof input.decisionContract === "object" &&
        (input.decisionContract as { validationPlan?: { hypothesis?: string; metrics?: string[]; period?: string } })
          .validationPlan?.hypothesis;

      const contractMetrics =
        input.decisionContract &&
        typeof input.decisionContract === "object"
          ? (input.decisionContract as { validationPlan?: { metrics?: string[] } }).validationPlan
              ?.metrics
          : undefined;

      const planBundle = createValidationPlanFromDecision({
        projectId: project.id,
        decisionId: record.id,
        problem: input.problem,
        judgement: input.judgement,
        validationPlan: input.validationPlan,
        hypothesisStatement: contractHypothesis || input.validationPlan,
        action: input.action,
        parentEvidenceIds: confirmGate.evidenceIds.length
          ? confirmGate.evidenceIds
          : input.parentEvidenceIds,
        growthPlan,
        confidence: gatedConfidence,
        metricNames: contractMetrics,
      });
      const validationTask = planBundle.task;

      let decisionContract: FounderDecisionContract | null = null;
      if (input.decisionContract && typeof input.decisionContract === "object") {
        const raw = input.decisionContract as unknown as FounderDecisionContract;
        if (raw.decisionId && raw.intent && raw.validationPlan) {
          decisionContract = approveDecisionContract(
            {
              ...raw,
              decisionId: raw.decisionId,
              projectId: project.id,
            },
            validationTask.id,
          );
          decisionContract = {
            ...decisionContract,
            validationPlan: {
              ...decisionContract.validationPlan,
              hypothesis:
                decisionContract.validationPlan.hypothesis ||
                planBundle.hypothesis.statement,
              taskId: validationTask.id,
            },
          };
        }
      }

      const legacyStatus =
        confirmGate.mode === "hypothesis"
          ? "hypothesis"
          : decisionContract?.status === "APPROVED"
            ? "executing"
            : "validating";
      const outcomePayload = {
        status: legacyStatus,
        confirmMode: confirmGate.mode,
        evidenceIds: confirmGate.evidenceIds,
        evidenceSufficient: confirmGate.mode === "formal",
        problemFingerprint: fingerprint,
        brandId: brand.id,
        supersedes: input.supersedesDecisionId || null,
        validationPlan: input.validationPlan || planBundle.period,
        focusChoice: input.focusChoice || null,
        meetingTitle: input.meetingTitle || "咨询会议",
        supportCount: support.length,
        opposeCount: oppose.length,
        confirmedAt: new Date().toISOString(),
        growthPlan,
        validationTask,
        validationHypothesis: planBundle.hypothesis,
        hypothesis: planBundle.hypothesis.statement,
        validationPlanBundle: {
          period: planBundle.period,
          hypothesisId: planBundle.hypothesis.hypothesisId,
          metrics: planBundle.metrics.map((m) => m.name),
        },
        decisionContract,
        decisionStatusLabel: decisionContract
          ? STATUS_LABEL[decisionContract.status]
          : undefined,
        actionPlanId: `ap_meeting_${record.id}`,
        councilTrace: input.councilTrace || null,
        councilSource:
          input.meetingTitle?.includes("七常委") ||
          (input.decisionContract as { source?: string } | undefined)?.source ===
            "decision_council"
            ? "decision_council"
            : null,
      };
      // Decision Runtime：主状态 APPROVED + 90 天复盘窗口（legacy status 仍保留）
      const outcomeWithMk = mergeMkStatusIntoOutcome(outcomePayload, "APPROVED");

      await prisma.decision.update({
        where: { id: record.id },
        data: { outcome: outcomeWithMk },
      });

      await emitDecisionRuntimeEvent(prisma, {
        decisionId: record.id,
        eventType: "DecisionApproved",
        sourceEventId: `DecisionApproved:${record.id}`,
        payload: {
          mkStatus: "APPROVED",
          confirmMode: confirmGate.mode,
          hypothesis: planBundle.hypothesis.statement,
          projectId: project.id,
        },
      });

      // Decision Runtime：会议意见/证据落入 MKDecision（Execution 仍由本流程写 lastActionPlan）
      let seeded = { opinionCount: 0, evidenceCount: 0 };
      try {
        seeded = await seedDecisionArtifactsFromMeeting(prisma, {
          decisionId: record.id,
          projectId: project.id,
          supportClaims: support,
          opposeClaims: oppose,
          expertOpinions: input.expertOpinions,
        });
      } catch (error) {
        console.warn("seedDecisionArtifactsFromMeeting failed:", error);
      }

      // MVP 闭环：批准后自动进入 M-EXEC（ActionPlan + Validation + D+7）
      let autoExec: Awaited<
        ReturnType<typeof createExecutionFromDecision>
      > | null = null;
      let executionError: string | null = null;
      try {
        autoExec = await createExecutionFromDecision(prisma, {
          projectId: project.id,
          ownerId: project.owner.id,
          decisionId: record.id,
          profile: {
            ...profile,
            growthPlan,
            lastDecisionContract: decisionContract,
            lastValidationHypothesis: planBundle.hypothesis,
            lastProblemFingerprint: fingerprint,
          },
          nextActions: input.nextActions,
        });
      } catch (error) {
        executionError =
          error instanceof Error ? error.message : "自动创建执行计划失败";
        console.warn("auto createExecutionFromDecision failed:", error);
      }

      try {
        await updateProjectProfile(project.id, (prefs) => {
          const { activeMeeting: _cleared, ...restPrefs } = prefs;
          const { suggestedNextMeeting: _clearedRedeision, ...restWithoutRedeision } =
            restPrefs;

          if (autoExec) {
            return {
              ...restWithoutRedeision,
              ...autoExec.nextProfile,
              ...(input.focusChoice ? { founderPreference: input.focusChoice } : {}),
              lastMeetingDecisionId: record.id,
              lastMeetingAt: new Date().toISOString(),
              growthPlan,
              lastDecisionContract: decisionContract,
              lastValidationHypothesis: planBundle.hypothesis,
              lastProblemFingerprint: fingerprint,
            };
          }

          // 降级：执行创建失败时仍写会议行动（旧路径）
          const existingTasks = asTaskArray(restPrefs.validationTasks);
          const todayActions = buildTodayActionsFromMeetingConfirm({
            nextActions: input.nextActions,
            action: input.action,
            validationPlan: input.validationPlan,
            judgement: input.judgement,
          });
          return {
            ...restWithoutRedeision,
            ...(input.focusChoice ? { founderPreference: input.focusChoice } : {}),
            lastMeetingDecisionId: record.id,
            lastMeetingAt: new Date().toISOString(),
            growthPlan,
            validationTasks: upsertValidationTask(existingTasks, validationTask),
            activeValidationTaskId: validationTask.id,
            lastDecisionContract: decisionContract,
            lastValidationHypothesis: planBundle.hypothesis,
            lastProblemFingerprint: fingerprint,
            lastActionPlan: {
              planId: `ap_meeting_${record.id}`,
              decisionId: record.id,
              summary: clipJudgement(input.judgement),
              goals: [
                {
                  goalId: `g_week_${record.id}`,
                  title: clipJudgement(input.judgement, 80),
                  horizonDays: 7,
                },
              ],
              actions: todayActions,
              alignmentNotes: input.focusChoice
                ? [`创始人关注：${input.focusChoice}`]
                : [],
              validationTaskId: validationTask.id,
            },
          };
        });
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }

      const memoryWrites = [
        ...(input.focusChoice
          ? [
              buildPreferenceMemoryWrite({
                projectId: project.id,
                label: "创始人关注",
                value: input.focusChoice,
                confidence: 0.88,
              }),
            ]
          : []),
        {
          writeId:
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `confirm-${Date.now()}`,
          projectId: project.id,
          type: "decision" as const,
          domain: "mixed" as const,
          summary: clipJudgement(input.judgement),
          payload: {
            decisionId: record.id,
            problem: input.problem,
            judgement: input.judgement,
            validationTaskId: validationTask.id,
            hypothesisId: planBundle.hypothesis.hypothesisId,
            confirmed: true,
          },
          source: "user_feedback" as const,
          createdAt: new Date().toISOString(),
        },
      ];
      await persistFounderMemoryWrites(prisma, project.owner.id, memoryWrites);

      // Evolution：与 decisionCouncil.founderDecide 对齐（签字即学习）
      try {
        const founderChoice =
          input.councilTrace?.founderChoice || "接受委员会";
        const signals = buildCouncilDecisionSignals({
          topic: input.problem,
          choice: founderChoice,
          recommendedAction:
            input.councilTrace?.recommendedAction || input.judgement,
          caseId: record.id,
          sessionId: input.councilTrace?.sessionId,
        });
        await updateProjectProfile(
          project.id,
          (latest) =>
            ingestSignalsAndEvolve(latest as Record<string, unknown>, signals),
          { ownerId: project.owner.id },
        );
      } catch (error) {
        console.warn("intelligence ingest after confirmFromMeeting failed", error);
      }

      return {
        decisionId: record.id,
        growthPlan,
        validationTask: autoExec?.result.validationTask || validationTask,
        validationHypothesis: planBundle.hypothesis,
        decisionContract,
        seededOpinions: seeded.opinionCount,
        seededEvidence: seeded.evidenceCount,
        executionStarted: Boolean(autoExec),
        executionError,
        actionPlanId: autoExec?.result.actionPlan.planId,
        mkStatus: autoExec?.result.mkStatus || "APPROVED",
      };
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
      // 主观反馈 ≠ 验证完成；不得写入 validated_outcome / 不得冒充 L4 证据
      const status =
        result === "aligned"
          ? "feedback_positive"
          : result === "partial"
            ? "feedback_partial"
            : "feedback_negative";

      const outcomeValue = {
        ...(existingOutcome ?? {}),
        helpful,
        result,
        status,
        evidenceGrade: "user_feedback" as const,
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
            ? `用户反馈偏正面（非验证结果）：${decision.judgement}`
            : result === "partial"
              ? `用户反馈部分成立（非验证结果）：${decision.problem}`
              : `用户反馈偏离（非验证结果）：${decision.problem}`,
        comment: input.comment ?? null,
        progressNote: input.progressNote ?? null,
        decisionId: input.decisionId,
        problem: decision.problem,
        judgement: decision.judgement,
        confidence: decision.confidence,
        score,
        result,
        evidenceGrade: "user_feedback",
      };

      await prisma.decision.update({
        where: { id: input.decisionId },
        data: {
          outcome: JSON.stringify(outcomeValue),
          learning: JSON.stringify(learningValue),
        },
      });

      if (decision.projectId) {
        try {
          await updateProjectProfile(decision.projectId, (prefs) => ({
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
          }));
        } catch (error) {
          const conflict = toProfileConflictTRPC(error);
          if (conflict) throw conflict;
          throw error;
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
          select: { id: true, ownerId: true },
        });
        if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

        try {
          await updateProjectProfile(
            project.id,
            (profile) => {
              const queue = Array.isArray(profile.positioningReviewQueue)
                ? (profile.positioningReviewQueue as Array<Record<string, unknown>>)
                : [];
              const nextQueue = queue.map((item) =>
                item.decisionId === input.decisionId
                  ? { ...item, status: input.status, resolvedAt: new Date().toISOString() }
                  : item,
              );
              return {
                ...profile,
                positioningReviewQueue: nextQueue,
              };
            },
            { ownerId: project.ownerId, prisma: tx },
          );
        } catch (error) {
          const conflict = toProfileConflictTRPC(error);
          if (conflict) throw conflict;
          throw error;
        }

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
