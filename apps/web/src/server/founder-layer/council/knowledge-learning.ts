/**
 * Knowledge Learning Loop — 持久化适配器
 *
 * 将 applyExpertLearning 的 learning_adjustments 持久化到 Memory 表，
 * 使七常委的知识库校准在重启后保持。
 *
 * 链：验证结果回写 → draftLearningFromCalibration → applyExpertLearning → persistLearningAdjustments
 */

import type { PrismaClient } from "@/generated/prisma";
import { saveMemory } from "@/server/services/agent-os.service";
import {
  applyExpertLearning,
  draftLearningFromCalibration,
  getLearningAdjustments,
  type LearningEvent,
} from "@mealkey/agents/founder-os";
import type { CouncilRoleId } from "@mealkey/agents/founder-os";

/**
 * 将校准提示持久化为学习事件
 */
export async function persistLearningFromCalibration(
  prisma: PrismaClient,
  ownerId: string,
  projectId: string,
  input: {
    caseId: string;
    member: CouncilRoleId;
    reason: string;
    actualResult?: string;
  },
): Promise<void> {
  const event = draftLearningFromCalibration(input);
  // 更新内存态知识库
  applyExpertLearning(event);

  // 持久化到 Memory 表
  const key = `council_learning_${input.member}_${input.caseId}`;
  await saveMemory(prisma, ownerId, {
    key,
    content: JSON.stringify({
      caseId: input.caseId,
      member: input.member,
      prediction: event.prediction,
      actualResult: event.actualResult,
      deviation: event.deviation,
      weightHint: event.suggestedWeightHint,
      createdAt: new Date().toISOString(),
    }),
    type: "LEARNING",
    source: `council:learning:${input.member}`,
    importance: 90,
    projectId,
  });
}

/**
 * 从 Memory 表恢复所有 learning_adjustments
 */
export async function restoreLearningAdjustments(
  prisma: PrismaClient,
  ownerId: string,
): Promise<void> {
  const memories = await prisma.memory.findMany({
    where: {
      ownerId,
      key: { startsWith: "council_learning_" },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  for (const m of memories) {
    try {
      const parsed = JSON.parse(m.content) as {
        member?: CouncilRoleId;
        prediction?: string;
        actualResult?: string;
        deviation?: string;
        weightHint?: string;
        caseId?: string;
      };
      if (!parsed.member || !parsed.caseId) continue;

      const event: LearningEvent = {
        caseId: parsed.caseId,
        roleId: parsed.member,
        prediction: parsed.prediction || "",
        actualResult: parsed.actualResult || "（已恢复）",
        deviation: parsed.deviation || "（已恢复）",
        suggestedWeightHint: parsed.weightHint || "保持当前权重",
      };
      applyExpertLearning(event);
    } catch {
      // skip malformed entries
    }
  }
}

/**
 * 获取某个常委当前的 learning adjustments（含已持久化的）
 */
export function getLearningAdjustmentsForRole(roleId: CouncilRoleId) {
  return getLearningAdjustments(roleId);
}
