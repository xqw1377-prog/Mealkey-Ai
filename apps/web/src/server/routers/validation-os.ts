/**
 * Validation OS Router V1 — 假设监督 / 进度回写 / 结果证据 / 重决策触发
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { validateProfile } from "@/lib/profile-schema";
import { saveMemory } from "@/server/services/agent-os.service";
import {
  COMMITTEE_LABEL,
  IMPACT_LABEL,
  LIFECYCLE_LABEL,
  type ValidationImpact,
  type ValidationTask,
} from "@/server/founder-layer/contracts/validation";
import {
  applyValidationCheckIn,
  completeValidationTask,
  daysRemaining,
  listActiveValidationTasks,
  normalizeValidationTask,
  upsertValidationTask,
} from "@/server/founder-layer/validation";
import {
  buildLearningMemoryWrite,
  persistFounderMemoryWrites,
} from "@/server/founder-layer/memory";
import {
  markDecisionLearned,
  refreshGrowthAfterValidation,
  tryPrismaDecisionId,
} from "@/server/founder-layer/capability";
import { projectRisksFromValidation } from "@/server/founder-layer/capability/risk/detect";
import { mergeRiskAlertsIntoProfile } from "@/server/founder-layer/capability/risk/profile";
import { projectOpportunitiesFromSignals } from "@/server/founder-layer/capability/opportunity/signals";
import { mergeOpportunitiesIntoProfile } from "@/server/founder-layer/capability/opportunity/profile";
import { loadFounderMemorySnapshot } from "@/server/founder-layer/memory";
import {
  buildExecutionFollowthroughSignal,
  buildPredictionErrorSignal,
  estimateActionPlanCompletion,
  extractBrandNamesFromProfile,
  ingestSignalsAndEvolve,
  parsePredictionFromSummary,
  readMemoryPermissions,
  tryContributeFromValidation,
  type BehaviorSignal,
} from "@/server/founder-layer/intelligence";
import { writeBackValidationResult } from "@/server/founder-layer/council/council-persistence";
import {
  deferOpportunitiesForBlockingRisk,
  pickTopOpenRiskAlert,
} from "@/server/founder-layer/capability/runtime-priority";
import { appendInvalidationContradicts } from "@/server/founder-layer/evidence";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "@/server/services/project-profile";
import {
  applyDeviationToProfile,
  applyExecutionFeedbackToProfile,
  detectDeviation,
} from "@/server/founder-layer/capability";

const log = createLogger("validation-os");

function asTaskArray(raw: unknown): ValidationTask[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object" && "id" in item)
    .map((item) => normalizeValidationTask(item as ValidationTask));
}

/** 根据裁决姿态 + 验证结果推断「谁对了」 */
function inferWhoWasRight(
  founderChoice: string | undefined,
  impact: ValidationImpact,
): "founder" | "council" | "mixed" | "unknown" {
  if (impact === "partial") return "mixed";
  const accepted = founderChoice === "接受委员会";
  const overturned = founderChoice === "推翻委员会";
  const modified = founderChoice === "修改方案";
  if (impact === "confirmed") {
    if (accepted) return "council";
    if (overturned) return "founder";
    if (modified) return "mixed";
    return "unknown";
  }
  // invalidated：接受委员会却失败 → 创始人更对；推翻却失败 → 委员会更对
  if (accepted) return "founder";
  if (overturned) return "council";
  if (modified) return "mixed";
  return "unknown";
}

function projectTone(task: ValidationTask) {
  const normalized = normalizeValidationTask(task);
  const remaining = daysRemaining(normalized.dueAt);
  const last = normalized.checkIns[normalized.checkIns.length - 1];
  const firedTriggers = normalized.triggers.filter((t) => t.fired);
  return {
    ...normalized,
    daysRemaining: remaining,
    latestCheckIn: last ?? null,
    lifecycleLabel: LIFECYCLE_LABEL[normalized.lifecycle],
    committeeLabel: COMMITTEE_LABEL[normalized.committee],
    hypothesisStatement: normalized.hypothesis.statement,
    riskIfWrong: normalized.hypothesis.riskIfWrong,
    suggestRedeision: firedTriggers.length > 0,
    triggerReasons: firedTriggers.map((t) => t.reason),
    riskLabel:
      normalized.lifecycle === "REVIEW" || normalized.status === "at_risk"
        ? "建议重新决策"
        : last?.riskLevel === "high"
          ? "偏离偏高"
          : last?.riskLevel === "medium"
            ? "轻度偏离"
            : "按计划",
  };
}

export const validationOsRouter = router({
  /** 决策验证中心：进行中的假设验证 */
  listActive: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, profile: true },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const tasks = listActiveValidationTasks(asTaskArray(profile.validationTasks));
      return {
        items: tasks.map(projectTone),
        centerTitle: "决策验证中心",
      };
    }),

  /** 单任务详情（验证中心卡片） */
  getTask: protectedProcedure
    .input(z.object({ projectId: z.string(), taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, profile: true },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const task = asTaskArray(profile.validationTasks).find(
        (item) => item.id === input.taskId || item.taskId === input.taskId,
      );
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "验证任务不存在" });
      return { task: projectTone(task) };
    }),

  /** 进度回写（人工录入指标） */
  checkIn: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        taskId: z.string(),
        note: z.string().min(1).max(300),
        reportedProgressRatio: z.number().min(0).max(1).optional(),
        metrics: z
          .array(
            z.object({
              metricId: z.string(),
              actual: z.string().max(80),
            }),
          )
          .max(8)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        include: { owner: { select: { id: true } } },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

      const updatedBox: { task: ValidationTask | null } = { task: null };
      try {
        await updateProjectProfile(
          project.id,
          (profile) => {
            const tasks = asTaskArray(profile.validationTasks);
            const current = tasks.find(
              (item) => item.id === input.taskId || item.taskId === input.taskId,
            );
            if (!current) {
              throw new TRPCError({ code: "NOT_FOUND", message: "验证任务不存在" });
            }

            const updated = applyValidationCheckIn({
              task: current,
              note: input.note,
              metrics: input.metrics,
              reportedProgressRatio: input.reportedProgressRatio,
            });
            updatedBox.task = updated;
            const nextTasks = upsertValidationTask(tasks, updated);
            let nextProfile: Record<string, unknown> = {
              ...profile,
              validationTasks: nextTasks,
              activeValidationTaskId: updated.id,
            };
            // Execution Runtime：偏航检测 → 建议复会（不终局改战略）
            const deviation = detectDeviation({
              projectId: project.id,
              task: updated,
            });
            if (deviation) {
              nextProfile = applyDeviationToProfile(nextProfile, deviation, {
                ownerId: project.owner.id,
              });
            }
            return nextProfile;
          },
          { ownerId: project.owner.id },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }
      const updated = updatedBox.task;
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "验证任务不存在" });
      }

      const decision = await prisma.decision.findFirst({
        where: { id: updated.decisionId, projectId: project.id },
      });
      if (decision) {
        const outcome =
          typeof decision.outcome === "string"
            ? (() => {
                try {
                  return JSON.parse(decision.outcome) as Record<string, unknown>;
                } catch {
                  return {};
                }
              })()
            : {};
        await prisma.decision.update({
          where: { id: decision.id },
          data: {
            outcome: JSON.stringify({
              ...outcome,
              status: updated.lifecycle === "REVIEW" ? "revisiting" : "validating",
              validationTask: updated,
              lastValidationCheckInAt: updated.updatedAt,
              suggestRedeision: updated.triggers.some((t) => t.fired),
            }),
          },
        });
      }

      await saveMemory(prisma, project.owner.id, {
        key: `founder_validation_checkin_${project.id}_${updated.id}_${Date.now()}`,
        content: JSON.stringify({
          taskId: updated.id,
          decisionId: updated.decisionId,
          hypothesisId: updated.hypothesisId,
          hypothesis: updated.hypothesis.statement,
          note: input.note,
          lifecycle: updated.lifecycle,
          passProbability: updated.passProbability,
          aiJudgement: updated.aiJudgement,
          triggersFired: updated.triggers.filter((t) => t.fired).map((t) => t.type),
          committee: updated.committee,
        }),
        type: "PROJECT",
        source: "validation-os:checkin",
        importance: updated.triggers.some((t) => t.fired) ? 88 : 78,
        projectId: project.id,
      });

      return { task: projectTone(updated) };
    }),

  /** 完成验证 → Outcome Evidence(L4) → Memory → 委员会回流 */
  complete: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        taskId: z.string(),
        result: z.enum(["aligned", "partial", "off"]),
        summary: z.string().min(1).max(400),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        include: {
          owner: { select: { id: true, name: true } },
        },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

      const impact: ValidationImpact =
        input.result === "aligned"
          ? "confirmed"
          : input.result === "partial"
            ? "partial"
            : "invalidated";

      const completedBox: { task: ValidationTask | null } = { task: null };
      let resultEvidenceId = "";
      let profileForGrowth: Record<string, unknown> | null = null;

      try {
        await updateProjectProfile(
          project.id,
          (profile) => {
            const tasks = asTaskArray(profile.validationTasks);
            const current = tasks.find(
              (item) => item.id === input.taskId || item.taskId === input.taskId,
            );
            if (!current) {
              throw new TRPCError({ code: "NOT_FOUND", message: "验证任务不存在" });
            }

            resultEvidenceId = `E-VAL-${current.id}`;
            const completed = completeValidationTask({
              task: current,
              resultSummary: input.summary,
              resultEvidenceId,
              impact,
            });
            completedBox.task = completed;
            const nextTasks = upsertValidationTask(tasks, completed);

            const evidenceLedger = Array.isArray(profile.evidenceLedger)
              ? ([...(profile.evidenceLedger as Array<Record<string, unknown>>)] as Array<
                  Record<string, unknown>
                >)
              : [];
            evidenceLedger.unshift({
              id: resultEvidenceId,
              type: "FACT",
              content: input.summary,
              source: "Validation OS",
              sourceLevel: "validated_outcome",
              reliability:
                impact === "confirmed" ? 0.92 : impact === "partial" ? 0.7 : 0.55,
              parentEvidenceIds: completed.parentEvidenceIds,
              taskId: completed.id,
              decisionId: completed.decisionId,
              hypothesisId: completed.hypothesisId,
              hypothesis: completed.hypothesis.statement,
              impact,
              impactLabel: IMPACT_LABEL[impact],
              committee: completed.committee,
              outcomeId: completed.outcome?.outcomeId,
              retrospective: completed.outcome?.retrospective,
              createdAt: new Date().toISOString(),
              origin: "validation_os",
            });

            let profileAfterTasks: Record<string, unknown> = {
              ...profile,
              validationTasks: nextTasks,
              evidenceLedger: evidenceLedger.slice(0, 80),
              activeValidationTaskId:
                listActiveValidationTasks(nextTasks)[0]?.id ?? null,
              committeeLearnings: {
                ...((profile.committeeLearnings as Record<string, unknown>) || {}),
                [completed.committee]: {
                  lastOutcomeId: completed.outcome?.outcomeId,
                  lastLearning: completed.outcome?.retrospective?.newLearning,
                  updatedAt: new Date().toISOString(),
                },
              },
            };

            if (impact === "invalidated") {
              profileAfterTasks = appendInvalidationContradicts(profileAfterTasks, {
                resultEvidenceId,
                parentEvidenceIds: completed.parentEvidenceIds,
              });
            }

            // Execution Runtime：结果反馈 → 建议复会（off / partial）
            profileAfterTasks = applyExecutionFeedbackToProfile(profileAfterTasks, {
              task: completed,
              result: input.result,
              impact,
              summary: input.summary,
            });

            profileForGrowth = profileAfterTasks;
            return profileAfterTasks;
          },
          { ownerId: project.owner.id },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }

      const completed = completedBox.task;
      if (!completed || !profileForGrowth) {
        throw new TRPCError({ code: "NOT_FOUND", message: "验证任务不存在" });
      }

      const growthRefresh = await refreshGrowthAfterValidation({
        prisma,
        ownerId: project.owner.id,
        projectId: project.id,
        profile: profileForGrowth,
        validation: {
          result: input.result,
          summary: input.summary,
          impact,
          hypothesis: completed.hypothesis.statement,
          learning: completed.outcome?.retrospective?.newLearning,
        },
      });

      try {
        const memorySnap = await loadFounderMemorySnapshot(
          prisma,
          project.owner.id,
          project.id,
          profileForGrowth,
        );
        const riskAlerts = projectRisksFromValidation({
          ownerId: project.owner.id,
          projectId: project.id,
          result: input.result,
          impact,
          summary: input.summary,
          hypothesis: completed.hypothesis.statement,
          committee: completed.committee,
          validationTaskId: completed.id,
          decisionId: completed.decisionId,
        });
        const failureLessons = memorySnap.patterns
          .filter((p) => p.kind === "failure")
          .map((p) => p.summary)
          .slice(0, 8);
        const weakest = [...growthRefresh.scores].sort(
          (a, b) => a.score - b.score,
        )[0];
        const opportunities = projectOpportunitiesFromSignals({
          ownerId: project.owner.id,
          projectId: project.id,
          memory: memorySnap,
          validationSurprise: {
            result: input.result,
            summary: input.summary,
            hypothesis: completed.hypothesis.statement,
          },
          weakestScore: weakest?.score,
          failureLessons,
        });

        await updateProjectProfile(
          project.id,
          (latest) => {
            let next: Record<string, unknown> = {
              ...latest,
              lastGrowthDelta: growthRefresh.lastGrowthDelta,
              lastCapabilityScores: growthRefresh.scores,
              lastCognitiveGap: growthRefresh.cognitiveGap,
              lastDecisionPattern: growthRefresh.decisionPattern,
              decisionPatterns: growthRefresh.decisionPatterns,
              lastGrowthPath: growthRefresh.growthPath,
              lastFounderCapabilities: growthRefresh.eightDim,
              lastDecisionQuality: growthRefresh.decisionQuality,
              growthEvents: growthRefresh.growthEvents,
              growthTasks: growthRefresh.growthTasks,
            };
            next = mergeRiskAlertsIntoProfile(next, riskAlerts);
            const blocking = pickTopOpenRiskAlert(next.openRiskAlerts);
            const deferred = deferOpportunitiesForBlockingRisk(
              opportunities,
              blocking,
            );
            next = mergeOpportunitiesIntoProfile(next, deferred);

            // User Intelligence：执行完成率 + 结果偏差信号
            const signals: BehaviorSignal[] = [];
            const completion = estimateActionPlanCompletion(next);
            if (completion != null) {
              signals.push(
                buildExecutionFollowthroughSignal({
                  planId: String(
                    (next.lastActionPlan as { planId?: string } | undefined)
                      ?.planId || "",
                  ),
                  completionRate: completion,
                }),
              );
            }
            const pred = parsePredictionFromSummary(input.summary);
            if (pred) {
              signals.push(
                buildPredictionErrorSignal({
                  metric: pred.metric,
                  predicted: pred.predicted,
                  actual: pred.actual,
                  unit: pred.unit,
                }),
              );
            }
            next = ingestSignalsAndEvolve(next, signals);
            return next;
          },
          { ownerId: project.owner.id },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }

      let learned: Awaited<ReturnType<typeof markDecisionLearned>> | null =
        null;
      const persistedDecisionId = tryPrismaDecisionId(completed.decisionId);
      if (persistedDecisionId) {
        try {
          learned = await markDecisionLearned(prisma, {
            decisionId: persistedDecisionId,
            projectId: project.id,
            result: input.result,
            impact,
            summary: input.summary,
            learning: completed.outcome?.retrospective?.newLearning,
            validationTaskId: completed.id,
            resultEvidenceId,
            learningRecord: {
              type: "validation_os_complete",
              taskId: completed.id,
              committee: completed.committee,
              retrospective: completed.outcome?.retrospective,
              score:
                impact === "confirmed" ? 0.9 : impact === "partial" ? 0.65 : 0.3,
              validationTask: completed,
              validationOutcome: completed.outcome,
            },
          });
        } catch (error) {
          log.warn("markDecisionLearned failed", { error: String(error) });
        }
      }

      const memPerm = readMemoryPermissions(
        (await prisma.project
          .findFirst({
            where: { id: project.id },
            select: { profile: true },
          })
          .then((p) =>
            p ? (validateProfile(p.profile) as Record<string, unknown>) : {},
          )) || {},
      );

      if (memPerm.saveExperience) {
        await saveMemory(prisma, project.owner.id, {
          key: `founder_validation_result_${project.id}_${completed.id}`,
          content: JSON.stringify({
            taskId: completed.id,
            decisionId: completed.decisionId,
            hypothesisId: completed.hypothesisId,
            hypothesis: completed.hypothesis.statement,
            result: input.result,
            impact,
            summary: input.summary,
            resultEvidenceId,
            sourceLevel: "validated_outcome",
            committee: completed.committee,
            committeeLabel: COMMITTEE_LABEL[completed.committee],
            retrospective: completed.outcome?.retrospective,
            mkStatus: learned?.mkStatus ?? null,
          }),
          type: "DECISION",
          source: "validation-os:complete",
          importance: 92,
          projectId: project.id,
        });
      }

      await persistFounderMemoryWrites(
        prisma,
        project.owner.id,
        [
          buildLearningMemoryWrite({
            projectId: project.id,
            decisionId: completed.decisionId,
            summary:
              completed.outcome?.retrospective?.newLearning ||
              input.summary,
            impact,
            committee: completed.committee,
            resultEvidenceId,
            retrospective: completed.outcome?.retrospective as
              | Record<string, unknown>
              | undefined,
          }),
          ...(learned ? [learned.memoryWrite] : []),
          ...growthRefresh.memoryWrites,
        ],
        {
          allowExperience: memPerm.saveExperience,
          allowGrowth: memPerm.useForPersonalGrowth,
          allowIndustry: memPerm.contributeToIndustryModel,
        },
      );

      // 七常委：验证结果回写 council_memory（有 caseId 时）
      try {
        const persistedDecisionId = tryPrismaDecisionId(completed.decisionId);
        if (persistedDecisionId) {
          const decisionRow = await prisma.decision.findFirst({
            where: { id: persistedDecisionId, projectId: project.id },
            select: { outcome: true },
          });
          let caseId: string | null = null;
          if (decisionRow?.outcome) {
            try {
              const outcome = JSON.parse(decisionRow.outcome) as {
                councilTrace?: { caseId?: string };
              };
              caseId = outcome.councilTrace?.caseId || null;
            } catch {
              caseId = null;
            }
          }
          if (caseId) {
            let founderChoice: string | undefined;
            if (decisionRow?.outcome) {
              try {
                const outcome = JSON.parse(decisionRow.outcome) as {
                  councilTrace?: { founderChoice?: string };
                };
                founderChoice = outcome.councilTrace?.founderChoice;
              } catch {
                founderChoice = undefined;
              }
            }
            const whoWasRight = inferWhoWasRight(founderChoice, impact);
            await writeBackValidationResult(prisma, project.owner.id, caseId, {
              whatHappened: input.summary,
              result:
                impact === "confirmed"
                  ? "success"
                  : impact === "invalidated"
                    ? "failure"
                    : "mixed",
              whoWasRight,
              lesson:
                completed.outcome?.retrospective?.newLearning ||
                input.summary,
            });
          }
        }
      } catch (error) {
        log.warn("council writeBackValidationResult failed", { error: String(error) });
      }

      // U4：跨租户行业脱敏贡献（仅 opt-in；失败不阻断）
      let industryContribution: {
        id: string;
        supportCount: number;
      } | null = null;
      if (memPerm.contributeToIndustryModel) {
        const latestProfile =
          (await prisma.project
            .findFirst({
              where: { id: project.id },
              select: { profile: true, category: true, name: true, city: true, district: true },
            })
            .then((p) =>
              p
                ? {
                    profile: validateProfile(p.profile) as Record<string, unknown>,
                    category: p.category,
                    name: p.name,
                    city: p.city,
                    district: p.district,
                  }
                : null,
            )) || null;
        industryContribution = await tryContributeFromValidation(prisma, {
          permissions: memPerm,
          ownerId: project.owner.id,
          category: latestProfile?.category || project.category,
          projectName: latestProfile?.name || project.name,
          brandNames: latestProfile
            ? extractBrandNamesFromProfile(latestProfile.profile)
            : [],
          ownerName: project.owner.name,
          city: latestProfile?.city || project.city,
          district: latestProfile?.district || project.district,
          hypothesis: completed.hypothesis.statement,
          summary: input.summary,
          learning: completed.outcome?.retrospective?.newLearning,
          impact,
        });
      }

      return {
        task: projectTone(completed),
        resultEvidenceId,
        outcome: completed.outcome,
        capabilityScores: growthRefresh.scores,
        growthDelta: growthRefresh.lastGrowthDelta,
        cognitiveGap: growthRefresh.cognitiveGap,
        decisionPattern: growthRefresh.decisionPattern,
        growthPath: growthRefresh.growthPath,
        mkStatus: learned?.mkStatus ?? null,
        decisionEvents: learned?.sourceEventIds ?? [],
        industryContribution,
      };
    }),
});
