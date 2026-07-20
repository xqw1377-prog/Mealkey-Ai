/**
 * V1：第二家店 DecisionCase 工厂（纯函数，不落库）
 */
import type { DecisionCaseV1 } from "@/server/founder-layer/contracts/decision-intelligence-data-contract";

export const EXPANSION_QUESTION =
  "是否应该在未来 12 个月内开第二家店？";

export function buildExpansionDecisionCase(input: {
  id: string;
  projectId: string;
  ownerId: string;
  ownerLabel: string;
  now?: Date;
}): DecisionCaseV1 {
  const now = (input.now ?? new Date()).toISOString();
  return {
    id: input.id,
    schemaVersion: 1,
    projectId: input.projectId,
    ownerId: input.ownerId,
    ownerLabel: input.ownerLabel,
    title: "是否开第二家店",
    question: EXPANSION_QUESTION,
    objective: "在可控风险下建立第二增长曲线",
    decisionType: "GROWTH",
    urgency: "MEDIUM",
    status: "DISCOVERED",
    deadline: "12个月",
    impactStars: 5,
    createdAt: now,
    updatedAt: now,
  };
}
