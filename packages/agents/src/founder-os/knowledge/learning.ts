/**
 * Expert Learning Loop
 * 预测 → 执行 → 结果 → 偏差 → 更新专家模型（learning_adjustments）
 */

import type { CouncilRoleId } from "../types";
import {
  getKnowledgeBase,
  type ExpertKnowledgeBase,
  type LearningAdjustment,
  KNOWLEDGE_BASES,
} from "./catalog";

export interface LearningEvent {
  caseId: string;
  roleId: CouncilRoleId;
  prediction: string;
  actualResult: string;
  deviation: string;
  /** 例如：提高人工敏感权重 */
  suggestedWeightHint: string;
}

function buildId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`;
  return `${prefix}-${rand}`;
}

/**
 * 将验证结果写回知识库的学习校准槽（内存态；持久化由 Memory/DB 层承接）
 */
export function applyExpertLearning(
  event: LearningEvent,
): ExpertKnowledgeBase {
  const kb = getKnowledgeBase(event.roleId);
  const adj: LearningAdjustment = {
    id: buildId("LA"),
    observation: `[${event.caseId}] 预测「${event.prediction}」→ 实际「${event.actualResult}」；偏差：${event.deviation}`,
    weight_hint: event.suggestedWeightHint,
    updatedAt: new Date().toISOString(),
  };
  const next: ExpertKnowledgeBase = {
    ...kb,
    learning_adjustments: [...(kb.learning_adjustments ?? []), adj].slice(-20),
  };
  KNOWLEDGE_BASES[event.roleId] = next;
  return next;
}

/**
 * 从少数意见/红线校准提示生成学习事件草稿
 */
export function draftLearningFromCalibration(input: {
  caseId: string;
  member: CouncilRoleId;
  reason: string;
  actualResult?: string;
}): LearningEvent {
  const laborHint =
    /人工|人力|labor/i.test(input.reason)
      ? "提高人工成本敏感权重"
      : /现金|现金流|跑道/.test(input.reason)
        ? "提高现金安全门槛权重"
        : /复制|SOP|高手/.test(input.reason)
          ? "提高复制可行性门槛"
          : "提高该失败模式的先验权重";

  return {
    caseId: input.caseId,
    roleId: input.member,
    prediction: input.reason,
    actualResult: input.actualResult ?? "（待验证回写）",
    deviation: input.actualResult
      ? "结果已回写，需对照预测"
      : "尚无实际结果，先登记预警",
    suggestedWeightHint: laborHint,
  };
}

export function getLearningAdjustments(roleId: CouncilRoleId): LearningAdjustment[] {
  return getKnowledgeBase(roleId).learning_adjustments ?? [];
}
