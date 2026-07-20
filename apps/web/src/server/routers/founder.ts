/**
 * Founder Layer tRPC — 会议编排薄封装（不改四 Agent 内核）
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import { resolveActiveBrand } from "@/lib/brand-registry";
import type { CompanyContext } from "@/server/founder";
import { buildFounderLoopRequest } from "@/server/founder/loop-request";
import {
  projectStartMeetingPayload,
  runFounderLoop,
  persistFounderMemoryWrites,
  generateDebateRound,
  loadFounderMemorySnapshot,
  recallForDecision,
} from "@/server/founder-layer";
import { detectStrategicForbiddenConflict } from "@/server/founder-layer/capability/risk/memory-conflict";
import { upsertOpenRiskAlert } from "@/server/founder-layer/capability/risk/profile";
import { projectFinancialCashRunwayRisk } from "@/server/founder-layer/capability/risk/detect";
import { mergeEvidencePackIntoProfile } from "@/server/founder-layer/evidence";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "@/server/services/project-profile";
import {
  assessFounderCapabilities,
  trendGlyph,
} from "@/server/founder-layer/capability";
import { buildCapabilityRigor } from "@/server/founder-layer/capability/growth/rigor";
import { countValidatedOutcomeRows } from "@/server/founder-layer/evidence";
import type { CapabilityScore } from "@/server/founder-layer/contracts/capability";
import { mapFourToEight } from "@/server/founder-layer/capability/growth/eight-dim";
import { buildGrowthRuntimeSnapshot } from "@/server/founder-layer/capability/growth/snapshot";
import { buildAssetContextBlock } from "@/server/services/asset.service";
import type { ExpertStatement } from "@/lib/meeting";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function contextFromProfile(
  project: { name: string; category: string | null; stage: string | null; profile: string | null },
): CompanyContext {
  const profile = validateProfile(project.profile) as Record<string, unknown>;
  const brand = resolveActiveBrand(profile, project.name);
  return {
    brandName: brand.brandName,
    industry:
      brand.category ||
      asString(profile.category) ||
      asString(profile.businessType) ||
      project.category ||
      "餐饮",
    storeCount: asString(profile.storeCount),
    city: asString(profile.city),
    stageLabel: asString(profile.stageLabel) || project.stage || undefined,
    currentChallenge: asString(profile.currentChallenge) || asString(profile.currentProblemTitle),
    yearlyGoal: asString(profile.yearlyGoal),
    strategicSummary:
      brand.oneLiner ||
      brand.mentalPosition ||
      asString(profile.strategicSummary),
    mentalPosition: brand.mentalPosition,
    targetCustomers: brand.targetCustomers,
    differentiation: brand.differentiation,
    brandTonality: brand.brandTonality,
    activeBrandId: brand.id,
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
        spendKind: z
          .enum(["brand", "market", "business", "capital", "council", "growth", "general"])
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
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const meetingTopic =
        input.topic?.trim() || input.question.slice(0, 80);
      const recall = await recallForDecision(prisma, {
        ownerId: project.ownerId,
        projectId: project.id,
        topic: meetingTopic,
        profile,
        limit: 8,
      });
      const currentMemory = await loadFounderMemorySnapshot(
        prisma,
        project.ownerId,
        project.id,
        profile,
      );
      // 开会先验：用 recall（含禁区提醒）加厚 priorBlock
      currentMemory.priorBlock = recall.priorBlock || currentMemory.priorBlock;

      // 会前 Risk：禁区冲突 + 现金流规则（不阻断开会，只写入 profile）
      {
        const memConflict = detectStrategicForbiddenConflict({
          ownerId: project.ownerId,
          projectId: project.id,
          snapshot: currentMemory,
          draftTopic: meetingTopic,
        });
        const cashMonths =
          typeof profile.cashMonths === "number"
            ? profile.cashMonths
            : typeof (profile.finance as { cashMonths?: number } | undefined)
                  ?.cashMonths === "number"
              ? (profile.finance as { cashMonths: number }).cashMonths
              : null;
        const cashRisk = projectFinancialCashRunwayRisk({
          ownerId: project.ownerId,
          projectId: project.id,
          cashMonths,
        });
        const preAlerts = [memConflict, cashRisk].filter(Boolean);
        if (preAlerts.length) {
          try {
            await updateProjectProfile(
              project.id,
              (prefs) => {
                let next = prefs;
                for (const alert of preAlerts) {
                  if (alert) next = upsertOpenRiskAlert(next, alert);
                }
                return next;
              },
              { ownerId: project.ownerId },
            );
          } catch {
            // 会前风险写入失败不阻断开会
          }
        }
      }

      const {
        chargeBusinessPoints,
        refundBusinessPoints,
        completeValueArchive,
        resolveSpendKind,
      } = await import("@/server/services/business-points.service");

      let mappedKind = resolveSpendKind({ spendKind: input.spendKind });
      if (!input.spendKind) {
        if (input.agents && input.agents.length >= 3) {
          mappedKind = "council";
        } else if (input.agents?.length === 1) {
          const code = input.agents[0];
          mappedKind = resolveSpendKind({
            agentCode:
              code === "M-PNT"
                ? "m-pnt"
                : code === "M-MKT"
                  ? "m-mkt"
                  : code === "M-BIZ"
                    ? "m-biz"
                    : code === "M-ED"
                      ? "m-ed"
                      : "chief",
          });
        } else {
          mappedKind = "council";
        }
      }

      const {
        evaluateEngineMeetingGate,
        countDegradedOpinions,
      } = await import("@/server/services/engine-meeting-gate");
      const engineGate = await evaluateEngineMeetingGate({
        agents: input.agents,
      });
      if (!engineGate.ok && !engineGate.allowDegraded) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            engineGate.note ||
            "专业引擎未就绪，已阻止扣点开会。请先启动引擎后再试。",
        });
      }

      let charge: Awaited<ReturnType<typeof chargeBusinessPoints>> | null = null;
      try {
        charge = await chargeBusinessPoints(prisma, ctx.userId!, {
          spendKind: mappedKind,
          sourceType: "founder_meeting",
          sourceId: meetingId,
          title: input.topic?.trim() || input.question.slice(0, 40),
        });
      } catch (error) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: error instanceof Error ? error.message : "当前经营点不足，请先充值",
        });
      }

      try {
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

      // 店访等已验证一手事实置顶进引擎上下文（与决策室证据包同源）
      {
        const {
          extractConsultingMeetingFacts,
          mergeAssetContextWithConsultingFacts,
        } = await import("@/server/services/consulting-meeting-facts");
        const consultingFacts = extractConsultingMeetingFacts(
          (profile as Record<string, unknown>) || {},
        );
        assetContextBlock = mergeAssetContextWithConsultingFacts(
          assetContextBlock,
          consultingFacts.lines,
        );
      }

      const runtime = await runFounderLoop({
        request: buildFounderLoopRequest({
          project,
          userId: ctx.userId!,
          message: input.question,
          companyContext,
          assetContextBlock,
          currentMemory,
        }),
        requiredAgents: input.agents,
      });

      await persistFounderMemoryWrites(prisma, project.ownerId, runtime.memoryWrites);

      // 沉淀 What-If / 冲突摘要 / 推动计划，供今日页催办（CAS 防并发覆盖）
      {
        const scenarios = runtime.meeting.debateSession?.scenarioTests ?? [];
        const triggers = runtime.meeting.debateSession?.challenges?.slice(0, 4) ?? [];
        try {
          await updateProjectProfile(
            project.id,
            (prefs) => {
              const existingTasks = Array.isArray(prefs.validationTasks)
                ? (prefs.validationTasks as Array<Record<string, unknown>>)
                : [];
              const nextTasks = runtime.validationTask
                ? [
                    runtime.validationTask as unknown as Record<string, unknown>,
                    ...existingTasks.filter(
                      (t) =>
                        String(t.id || t.taskId) !== runtime.validationTask!.taskId,
                    ),
                  ].slice(0, 12)
                : existingTasks;

              return mergeEvidencePackIntoProfile(
                {
                  ...prefs,
                  lastDebateScenarios: scenarios.map((s) => ({
                    scenario: s.scenario,
                    trigger: s.trigger,
                    impact: s.impact,
                    mitigation: s.mitigation,
                  })),
                  lastDebateConflicts: (runtime.meeting.debateSession?.conflicts ?? [])
                    .slice(0, 3)
                    .map((c) => ({
                      topic: c.topic,
                      severity: c.severity,
                      summary: c.summary,
                    })),
                  lastDebateAt: new Date().toISOString(),
                  lastMeetingRecommendation: runtime.meeting.recommendation,
                  lastChallengeCitations: triggers.map((ch) => ({
                    from: ch.fromCommittee,
                    targetEvidenceId: ch.targetEvidenceId,
                    type: ch.challengeType,
                  })),
                  lastActionPlan: runtime.actionPlan
                    ? {
                        planId: runtime.actionPlan.planId,
                        summary: runtime.actionPlan.summary,
                        goals: runtime.actionPlan.goals,
                        actions: runtime.actionPlan.actions.slice(0, 8),
                        alignmentNotes: runtime.actionPlan.alignmentNotes,
                        validationTaskId: runtime.actionPlan.validationTaskId,
                      }
                    : prefs.lastActionPlan,
                  lastGrowthDelta: runtime.growthDelta
                    ? {
                        deltaId: runtime.growthDelta.deltaId,
                        summary: runtime.growthDelta.summary,
                        reflections: runtime.growthDelta.reflections.slice(0, 5),
                        learningNext: runtime.growthDelta.learningNext.slice(0, 4),
                        scores: runtime.growthDelta.scores,
                        createdAt: runtime.growthDelta.createdAt,
                      }
                    : prefs.lastGrowthDelta,
                  lastCapabilityScores: runtime.growthDelta?.scores?.length
                    ? runtime.growthDelta.scores
                    : prefs.lastCapabilityScores,
                  lastDecisionPack: runtime.decisionPack
                    ? {
                        packId: runtime.decisionPack.packId,
                        chosen: runtime.decisionPack.chosen,
                        strategyDecision: runtime.decisionPack.strategyDecision,
                        summary: runtime.decisionPack.summary,
                        evidenceStatus: runtime.decisionPack.evidenceStatus,
                        capitalBrief: runtime.decisionPack.capitalBrief ?? null,
                        topRisks: (runtime.decisionPack.risks ?? [])
                          .slice(0, 3)
                          .map((r) => r.title),
                        createdAt: runtime.decisionPack.createdAt,
                      }
                    : prefs.lastDecisionPack,
                  validationTasks: nextTasks,
                },
                runtime.evidencePack,
                { missionId: runtime.mission.missionId },
              );
            },
            { ownerId: project.ownerId },
          );
        } catch (error) {
          const conflict = toProfileConflictTRPC(error);
          if (conflict) throw conflict;
          throw error;
        }
      }

      const payload = projectStartMeetingPayload({
        meetingId,
        companyId: project.id,
        companyContext,
        runtime,
        topic: input.topic?.trim() || undefined,
      });

      const degradedSeats = countDegradedOpinions(payload.opinions);

      // 生产且未放行：任一外呼席启发式 → 退点并拒绝当正式交付（防假咨询收费）
      if (degradedSeats > 0 && !engineGate.allowDegraded) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `本场有 ${degradedSeats} 个顾问席降级为启发式，不能当作引擎交付。经营点将退回，请修好外呼后再开会。`,
        });
      }

      await completeValueArchive(prisma, ctx.userId!, {
        sourceId: meetingId,
        title: input.topic?.trim() || input.question.slice(0, 40),
        gained: [
          runtime.decisionPack?.strategyDecision,
          runtime.decisionPack?.summary,
          runtime.actionPlan?.summary,
          "验证计划",
        ].filter(Boolean) as string[],
      });

      const agentRunIds = [
        ...new Set(
          (runtime.meeting.opinions ?? [])
            .map((opinion) => opinion.rawRef?.agentRunId)
            .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
        ),
      ];
      if (charge?.ledgerId && agentRunIds.length > 0) {
        await settleCapabilityConsumption(prisma, {
          recordId: charge.ledgerId,
          runId: agentRunIds.length === 1 ? agentRunIds[0] : undefined,
          metadata: {
            sourceType: "founder_meeting",
            sourceId: meetingId,
            meetingId,
            missionId: runtime.mission.missionId,
            agentRunIds,
          },
        });
      }

      return {
        ...payload,
        billing: charge
          ? {
              spent: charge.points,
              balanceAfter: charge.balanceAfter,
              spendKind: charge.spendKind,
            }
          : null,
        engineGate: {
          ok: engineGate.ok,
          allowDegraded: engineGate.allowDegraded,
          degradedSeats,
          note:
            engineGate.note ||
            (degradedSeats > 0
              ? `本场有 ${degradedSeats} 个席位降级，不能当作引擎已完成。`
              : null),
          down: engineGate.down.map((e) => ({
            id: e.id,
            label: e.label,
          })),
        },
      };
      } catch (error) {
        await refundBusinessPoints(prisma, ctx.userId!, {
          sourceType: "founder_meeting",
          sourceId: meetingId,
          points: charge?.points,
          reason: "本次分析未完成，经营点已退回",
        });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "会议启动失败，经营点已退回",
        });
      }
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
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const currentMemory = await loadFounderMemorySnapshot(
        prisma,
        project.ownerId,
        project.id,
        profile,
      );
      const {
        extractConsultingMeetingFacts,
        mergeAssetContextWithConsultingFacts,
      } = await import("@/server/services/consulting-meeting-facts");
      const consultingFacts = extractConsultingMeetingFacts(profile);
      const assetContextBlock = mergeAssetContextWithConsultingFacts(
        undefined,
        consultingFacts.lines,
      );
      const result = await runFounderLoop({
        request: buildFounderLoopRequest({
          project,
          userId: ctx.userId!,
          message: input.message,
          companyContext: legacy,
          assetContextBlock,
          currentMemory,
        }),
        requiredAgents: input.agents,
      });

      await persistFounderMemoryWrites(prisma, project.ownerId, result.memoryWrites);

      return result;
    }),

  /** Memory Engine：读取企业记忆快照（事实/决策/偏好/成败模式） */
  getMemorySnapshot: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, profile: true, ownerId: true },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const snapshot = await loadFounderMemorySnapshot(
        prisma,
        project.ownerId,
        project.id,
        profile,
      );
      return {
        facts: snapshot.facts,
        decisions: snapshot.decisions,
        preferences: snapshot.preferences,
        patterns: snapshot.patterns,
        priorBlock: snapshot.priorBlock,
        counts: {
          facts: snapshot.facts.length,
          decisions: snapshot.decisions.length,
          preferences: snapshot.preferences.length,
          patterns: snapshot.patterns.length,
        },
      };
    }),

  /** 四大能力状态：Memory 实时评估 + 上次 GrowthDelta */
  getCapabilityStatus: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, name: true, profile: true, ownerId: true },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const snapshot = await loadFounderMemorySnapshot(
        prisma,
        project.ownerId,
        project.id,
        profile,
      );

      const lastScoresRaw = Array.isArray(profile.lastCapabilityScores)
        ? (profile.lastCapabilityScores as CapabilityScore[])
        : undefined;
      const lastActionPlan = profile.lastActionPlan as
        | {
            planId?: string;
            summary?: string;
            validationTaskId?: string;
            goals?: unknown[];
            actions?: unknown[];
          }
        | undefined;
      const lastGrowthDelta = profile.lastGrowthDelta as
        | {
            deltaId?: string;
            summary?: string;
            reflections?: string[];
            learningNext?: string[];
            createdAt?: string;
          }
        | undefined;

      const validationTasks = Array.isArray(profile.validationTasks)
        ? (profile.validationTasks as Array<Record<string, unknown>>)
        : [];
      const activeValidationCount = validationTasks.filter((t) => {
        const status = String(t.status || t.lifecycle || "");
        return !["done", "completed", "cancelled", "failed"].includes(status);
      }).length;

      const syntheticActionPlan = lastActionPlan
        ? {
            planId: String(lastActionPlan.planId || "ap_profile"),
            missionId: "from_profile",
            agentId: "execution" as const,
            goals: (Array.isArray(lastActionPlan.goals)
              ? lastActionPlan.goals
              : []) as import("@/server/founder-layer/contracts/capability").ActionPlan["goals"],
            actions: (Array.isArray(lastActionPlan.actions)
              ? lastActionPlan.actions
              : []) as import("@/server/founder-layer/contracts/capability").ActionPlan["actions"],
            alignmentNotes: [] as string[],
            communicationDrafts: [] as string[],
            validationTaskId: lastActionPlan.validationTaskId
              ? String(lastActionPlan.validationTaskId)
              : undefined,
            summary: String(lastActionPlan.summary || ""),
            createdAt: new Date().toISOString(),
          }
        : null;

      const rigor = buildCapabilityRigor(profile);
      const validatedOutcomeCount =
        rigor.validatedOutcomeCount || countValidatedOutcomeRows(profile.evidenceLedger);

      const scores = assessFounderCapabilities({
        memory: snapshot,
        actionPlan: syntheticActionPlan,
        priorScores: lastScoresRaw,
        activeValidationCount,
        decisionsWithOutcome: validatedOutcomeCount,
        validatedOutcomeCount,
      });

      const weakest = [...scores].sort((a, b) => a.score - b.score)[0];
      const strongest = [...scores].sort((a, b) => b.score - a.score)[0];

      const growthSnap = buildGrowthRuntimeSnapshot({
        ...profile,
        lastCapabilityScores: scores,
      });
      const eightDim =
        growthSnap.eightDim && growthSnap.eightDim.length === 8
          ? growthSnap.eightDim
          : mapFourToEight(scores);

      return {
        projectId: project.id,
        projectName: resolveActiveBrand(profile, project.name).brandName,
        scores: scores.map((s) => ({
          ...s,
          trendGlyph: trendGlyph(s.trend),
        })),
        weakestId: weakest?.id ?? null,
        strongestId: strongest?.id ?? null,
        /** Growth Runtime 八维（能力页雷达） */
        eightDim: eightDim.map((d) => ({
          dim: d.dim,
          label: d.label,
          score: d.score,
          confidence: d.confidence,
          note: d.note ?? null,
        })),
        decisionQuality: growthSnap.decisionQuality
          ? {
              total: growthSnap.decisionQuality.total,
              judgement: growthSnap.decisionQuality.judgement,
              execution: growthSnap.decisionQuality.execution,
              result: growthSnap.decisionQuality.result,
            }
          : null,
        rigor: {
          ...rigor,
          validatedOutcomeCount,
          evidenceSufficiencyLabel:
            rigor.evidenceSufficiency === "sufficient"
              ? "证据充分"
              : rigor.evidenceSufficiency === "insufficient"
                ? "证据不足"
                : "证据状态未知",
        },
        lastGrowthDelta: lastGrowthDelta
          ? {
              deltaId: lastGrowthDelta.deltaId ?? null,
              summary: lastGrowthDelta.summary ?? null,
              reflections: lastGrowthDelta.reflections ?? [],
              learningNext: lastGrowthDelta.learningNext ?? [],
              createdAt: lastGrowthDelta.createdAt ?? null,
            }
          : null,
        memoryCounts: {
          facts: snapshot.facts.length,
          decisions: snapshot.decisions.length,
          preferences: snapshot.preferences.length,
          patterns: snapshot.patterns.length,
          activeValidations: activeValidationCount,
        },
      };
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
