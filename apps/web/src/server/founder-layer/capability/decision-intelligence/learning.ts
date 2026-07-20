import type { PrismaClient } from "@/generated/prisma";
import type {
  DecisionAssessmentV1,
  DecisionLearningV1,
} from "@/server/founder-layer/contracts/decision-intelligence-data-contract";
import {
  PROFILE_HABIT_KEY,
  type OperatingDecisionHabitV1,
} from "@/server/founder-layer/contracts/decision-habit";
import { createRestaurantBrainService } from "@/server/restaurant-brain/service";
import { updateProjectProfile } from "@/server/services/project-profile";

export function buildExpansionLearning(input: {
  decisionId: string;
  projectId: string;
  prediction: string;
  actualResult: string;
  successBand?: "success" | "partial" | "fail";
  pre?: DecisionAssessmentV1;
  post?: DecisionAssessmentV1;
  founderOverride?: boolean;
}): DecisionLearningV1 {
  const band = input.successBand;
  const ok =
    band === "success" ||
    (!band && /提升|成功|达标|改善/.test(input.actualResult));
  const fail =
    band === "fail" ||
    (!band && /失败|亏损|撑不住|未达/.test(input.actualResult));

  let pattern: string;
  if (ok) {
    pattern = "在组织与现金门槛满足后推进扩张，更易兑现预期";
  } else if (fail) {
    pattern = "组织/店长或现金未达标时快速扩张，偏航或承压概率上升";
  } else {
    pattern = "扩张结果常部分达成——需把店长独立与利润缓冲写成硬门槛";
  }

  return {
    id: `learn_${input.decisionId}`,
    decisionId: input.decisionId,
    projectId: input.projectId,
    prediction: input.prediction,
    actualResult: input.actualResult,
    difference: `预测信心 ${input.pre?.confidenceScore ?? "—"} → 事后 ${input.post?.confidenceScore ?? "—"}`,
    insight: input.actualResult,
    pattern,
    confidence: ok ? 0.75 : fail ? 0.82 : 0.7,
    preScoreTotal: input.pre?.confidenceScore,
    postScoreTotal: input.post?.confidenceScore,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Learning → 经营决策习惯（老板可见投影）
 */
export function buildOperatingHabitFromLearning(input: {
  projectId: string;
  learning: DecisionLearningV1;
  successBand: "success" | "partial" | "fail";
  previous?: OperatingDecisionHabitV1 | null;
  founderOverride?: boolean;
}): OperatingDecisionHabitV1 {
  const traits = new Set(input.previous?.traits || []);
  if (input.founderOverride) traits.add("愿意坚持己见");
  if (input.successBand === "success") {
    traits.add("增长导向");
    traits.add("偏好验证后推进");
  } else if (input.successBand === "fail") {
    traits.add("执行速度快");
    traits.add("需警惕现金安排");
  } else {
    traits.add("边做边调");
  }

  const traitList = [...traits].slice(0, 5);
  const sampleCount = (input.previous?.sampleCount || 0) + 1;
  const reminder =
    input.successBand === "fail"
      ? `系统逐渐发现你的经营特点：${traitList.join("、")}。提醒：最近这次扩张相关复盘显示，风险主要来自执行条件未齐（如现金/店长）。`
      : input.successBand === "success"
        ? `系统逐渐发现你的经营特点：${traitList.join("、")}。在门槛满足时推进，更符合你过往兑现结果的方式。`
        : `系统逐渐发现你的经营特点：${traitList.join("、")}。部分达成常见——建议把未验证门槛写进下次决策的「缺少」项。`;

  const sources = [
    ...(input.previous?.sourceDecisionIds || []),
    input.learning.decisionId,
  ].slice(-8);

  return {
    schemaVersion: 1,
    projectId: input.projectId,
    traits: traitList,
    reminder,
    lastLesson: input.learning.pattern,
    sampleCount,
    updatedAt: new Date().toISOString(),
    sourceDecisionIds: sources,
  };
}

export function habitReminderFromBrainPatterns(
  patterns: Array<{ pattern: string; insight: string; confidence: number }>,
  projectId: string,
): OperatingDecisionHabitV1 | null {
  if (!patterns.length) return null;
  const top = patterns.slice(0, 3);
  return {
    schemaVersion: 1,
    projectId,
    traits: top.map((p) => p.pattern.slice(0, 16)),
    reminder: `系统逐渐发现你的经营特点：${top.map((p) => p.pattern).join("；")}。`,
    lastLesson: top[0]?.insight,
    sampleCount: top.length,
    updatedAt: new Date().toISOString(),
    sourceDecisionIds: [],
  };
}

export async function persistLearningToBrain(
  prisma: PrismaClient,
  input: {
    projectId: string;
    ownerId: string;
    learning: DecisionLearningV1;
  },
): Promise<string | undefined> {
  const brain = createRestaurantBrainService(prisma);
  const snap = await brain.ensureByProject({
    projectId: input.projectId,
    ownerId: input.ownerId,
  });
  const id = `bl_${input.learning.decisionId}`;
  await brain.learn({
    id,
    restaurantId: snap.restaurant.id,
    sourceType: "decision",
    sourceId: input.learning.decisionId,
    pattern: input.learning.pattern,
    insight: input.learning.insight,
    confidence: input.learning.confidence,
    appliedCount: 0,
    createdAt: input.learning.createdAt,
  });
  return id;
}

export async function persistHabitToProfile(
  prisma: PrismaClient,
  input: {
    projectId: string;
    ownerId: string;
    habit: OperatingDecisionHabitV1;
  },
): Promise<void> {
  await updateProjectProfile(
    input.projectId,
    (profile) => ({
      ...profile,
      [PROFILE_HABIT_KEY]: input.habit,
    }),
    { ownerId: input.ownerId, prisma },
  );
}

export function readHabitFromProfile(
  profile: unknown,
): OperatingDecisionHabitV1 | null {
  if (!profile || typeof profile !== "object") return null;
  const h = (profile as Record<string, unknown>)[PROFILE_HABIT_KEY];
  if (!h || typeof h !== "object") return null;
  const o = h as Record<string, unknown>;
  if (o.schemaVersion !== 1 || typeof o.reminder !== "string") return null;
  return h as OperatingDecisionHabitV1;
}
