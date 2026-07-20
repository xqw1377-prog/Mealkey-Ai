/**
 * 验证回写后刷新四大能力分与 GrowthDelta（轻量，不重跑全链路）
 */

import type { PrismaClient } from "@/generated/prisma";
import type { ActionPlan, CapabilityScore } from "../../contracts/capability";
import type { FounderMemoryWrite } from "../../contracts/memory";
import { stampMemoryLayer } from "../../contracts/memory-runtime";
import type {
  CognitiveGap,
  DecisionPattern,
  DecisionQualityScore,
  FounderCapabilityScore,
  GrowthEvent,
  GrowthPathItem,
  GrowthTask,
} from "../../contracts/growth-runtime";
import { loadFounderMemorySnapshot } from "../../memory";
import { assessFounderCapabilities } from "./scoring";
import { detectCognitiveGap } from "./cognitive-gap";
import {
  buildDecisionPattern,
  buildGrowthPath,
  prependDecisionPatternHistory,
} from "./decision-pattern";
import { mapFourToEight } from "./eight-dim";
import { aggregateDecisionQuality } from "./decision-quality";
import {
  prependGrowthEvents,
  projectGrowthEventsFromValidation,
} from "./events";
import { buildGrowthTasksFromGap, mergeGrowthTasks } from "./tasks";

function buildId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${prefix}_${crypto.randomUUID().slice(0, 8)}`
    : `${prefix}_${Date.now().toString(36)}`;
}

function clip(text: string, max = 120) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export interface RefreshGrowthAfterValidationInput {
  prisma: PrismaClient;
  ownerId: string;
  projectId: string;
  profile: Record<string, unknown>;
  validation: {
    result: "aligned" | "partial" | "off";
    summary: string;
    impact: "confirmed" | "partial" | "invalidated";
    hypothesis?: string;
    learning?: string;
  };
}

export interface RefreshGrowthAfterValidationResult {
  scores: CapabilityScore[];
  lastGrowthDelta: {
    deltaId: string;
    summary: string;
    reflections: string[];
    learningNext: string[];
    scores: CapabilityScore[];
    createdAt: string;
  };
  memoryWrites: FounderMemoryWrite[];
  /** Growth Runtime 增量 */
  cognitiveGap: CognitiveGap | null;
  decisionPattern: DecisionPattern;
  growthPath: GrowthPathItem[];
  decisionPatterns: DecisionPattern[];
  eightDim: FounderCapabilityScore[];
  decisionQuality: DecisionQualityScore | null;
  growthEvents: GrowthEvent[];
  growthTasks: GrowthTask[];
}

function priorScoresFromProfile(profile: Record<string, unknown>): CapabilityScore[] | undefined {
  if (!Array.isArray(profile.lastCapabilityScores)) return undefined;
  return profile.lastCapabilityScores as CapabilityScore[];
}

function actionPlanFromProfile(
  profile: Record<string, unknown>,
): ActionPlan | null {
  const raw = profile.lastActionPlan as Record<string, unknown> | undefined;
  if (!raw) return null;
  return {
    planId: String(raw.planId || "ap_profile"),
    missionId: "from_profile",
    agentId: "execution",
    goals: Array.isArray(raw.goals) ? (raw.goals as ActionPlan["goals"]) : [],
    actions: Array.isArray(raw.actions)
      ? (raw.actions as ActionPlan["actions"])
      : [],
    alignmentNotes: [],
    communicationDrafts: [],
    validationTaskId: raw.validationTaskId
      ? String(raw.validationTaskId)
      : undefined,
    summary: String(raw.summary || ""),
    createdAt: new Date().toISOString(),
  };
}

/**
 * 验证完成 → 重新评估能力分，写入可展示的 GrowthDelta。
 */
export async function refreshGrowthAfterValidation(
  input: RefreshGrowthAfterValidationInput,
): Promise<RefreshGrowthAfterValidationResult> {
  const memory = await loadFounderMemorySnapshot(
    input.prisma,
    input.ownerId,
    input.projectId,
    input.profile,
  );

  const validationTasks = Array.isArray(input.profile.validationTasks)
    ? (input.profile.validationTasks as Array<Record<string, unknown>>)
    : [];
  const activeValidationCount = validationTasks.filter((t) => {
    const status = String(t.status || t.lifecycle || "");
    return !["done", "completed", "cancelled", "failed"].includes(status);
  }).length;

  const prior = priorScoresFromProfile(input.profile);
  const actionPlan = actionPlanFromProfile(input.profile);

  const evidenceLedger = Array.isArray(input.profile.evidenceLedger)
    ? (input.profile.evidenceLedger as Array<Record<string, unknown>>)
    : [];
  const validatedOutcomeCount = evidenceLedger.filter(
    (row) => String(row.sourceLevel || "") === "validated_outcome",
  ).length;
  // 本次 complete 计入至少 1；不以 patterns 虚增
  const decisionsWithOutcome = Math.max(1, validatedOutcomeCount);

  const scores = assessFounderCapabilities({
    memory,
    actionPlan,
    priorScores: prior,
    activeValidationCount,
    decisionsWithOutcome,
    validatedOutcomeCount: decisionsWithOutcome,
  });

  const weakest = [...scores].sort((a, b) => a.score - b.score)[0];
  const resultLabel =
    input.validation.result === "aligned"
      ? "验证通过"
      : input.validation.result === "partial"
        ? "部分成立"
        : "验证未过";

  const reflections = [
    clip(
      `${resultLabel}：${input.validation.summary}`,
      140,
    ),
    input.validation.hypothesis
      ? clip(`原假设：${input.validation.hypothesis}`, 120)
      : null,
    input.validation.learning
      ? clip(`新学习：${input.validation.learning}`, 120)
      : null,
    weakest
      ? clip(`回写后短板仍在「${weakest.label} ${weakest.score}」`, 100)
      : null,
  ].filter(Boolean) as string[];

  const learningNext: string[] = [];
  if (input.validation.impact === "invalidated") {
    learningNext.push("带着证伪结果重开委员会，改写下一次可验证假设。");
  } else if (input.validation.impact === "partial") {
    learningNext.push("保留有效部分，收窄假设边界后再做一轮小样本验证。");
  } else {
    learningNext.push("把成功条件写入决策记忆，再决定是否放大动作。");
  }
  if (weakest?.id === "execution") {
    learningNext.push("把通过的验证拆成下周可执行清单与责任人。");
  } else if (weakest?.id === "cognition") {
    learningNext.push("补齐被证伪/证实相关的市场或品牌事实。");
  } else {
    learningNext.push("每周至少一次：委员会判断 → 行动验证 → 成长回写。");
  }

  const cognitiveGap = detectCognitiveGap({
    result: input.validation.result,
    hypothesis: input.validation.hypothesis,
    summary: input.validation.summary,
  });
  if (cognitiveGap) {
    learningNext.unshift(
      `认知校准：别再只归因「${cognitiveGap.believedCause}」——${cognitiveGap.likelyRootCause}`,
    );
  }

  const decisionPattern = buildDecisionPattern({
    hypothesis: input.validation.hypothesis,
    summary: input.validation.summary,
    impact: input.validation.impact,
    learning: input.validation.learning,
  });
  const decisionPatterns = prependDecisionPatternHistory(
    input.profile,
    decisionPattern,
  );
  const growthPath = buildGrowthPath({
    scores,
    stage: String(input.profile.stageLabel || input.profile.stage || ""),
    lastOutcome: decisionPattern.outcome,
  });
  for (const item of growthPath.slice(0, 2)) {
    if (!learningNext.includes(item.title)) {
      learningNext.push(item.title);
    }
  }

  const summary = clip(
    cognitiveGap
      ? `${resultLabel}后发现${cognitiveGap.summary}；短板「${weakest?.label ?? "待校准"}」· ${learningNext[0]}`
      : `验证回写（${resultLabel}）后能力已更新；短板「${weakest?.label ?? "待校准"} ${weakest?.score ?? "—"}」· ${learningNext[0]}`,
    140,
  );

  const createdAt = new Date().toISOString();
  const deltaId = buildId("gd");
  const lastGrowthDelta = {
    deltaId,
    summary,
    reflections: reflections.slice(0, 5),
    learningNext: learningNext.slice(0, 5),
    scores,
    createdAt,
  };

  const eightDim = mapFourToEight(scores);
  const decisionQuality = aggregateDecisionQuality(decisionPatterns, 10);
  const newEvents = projectGrowthEventsFromValidation({
    result: input.validation.result,
    impact: input.validation.impact,
    summary: input.validation.summary,
    pattern: decisionPattern,
    gap: cognitiveGap,
  });
  const growthEvents = prependGrowthEvents(input.profile, newEvents);
  const growthTasks = mergeGrowthTasks(
    input.profile,
    buildGrowthTasksFromGap({
      gap: cognitiveGap,
      scores,
      learningNext: learningNext.slice(0, 3),
    }),
  );

  const memoryWrites: FounderMemoryWrite[] = [
    stampMemoryLayer({
      writeId: buildId("mw"),
      projectId: input.projectId,
      missionId: undefined,
      type: "learning",
      summary,
      payload: {
        growthDeltaId: deltaId,
        validationResult: input.validation.result,
        cognitiveGap,
        decisionPattern,
        scores: scores.map((s) => ({ id: s.id, score: s.score })),
        decisionQuality,
      },
      domain: "mixed",
      source: "growth_engine",
      createdAt,
    }),
  ];

  return {
    scores,
    lastGrowthDelta,
    memoryWrites,
    cognitiveGap,
    decisionPattern,
    growthPath,
    decisionPatterns,
    eightDim,
    decisionQuality,
    growthEvents,
    growthTasks,
  };
}
