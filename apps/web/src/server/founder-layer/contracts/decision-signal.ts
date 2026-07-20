/**
 * Decision Signal V1 — Experience 关键层（非 Prisma 表）
 * 权威：MEALKEY_DECISION_EXPERIENCE_V1 · Engineering Blueprint Phase 0
 *
 * Signal ≠ Case：不是所有异常都值得老板开会。
 */

import type { DecisionHorizonV1 } from "./business-identity";

export type DecisionSignalSourceV1 =
  | "BRAIN"
  | "M_INTEL"
  | "USER"
  | "SYSTEM"
  | "RISK_RUNTIME"
  | "OPPORTUNITY_RUNTIME";

export type DecisionSignalTypeV1 =
  | "RISK"
  | "OPPORTUNITY"
  | "CHANGE"
  | "UNKNOWN";

export type DecisionSignalStatusV1 =
  | "open"
  | "candidate"
  | "opened_case"
  | "dismissed"
  | "merged";

/**
 * 例：南门店连续4周晚餐客流下降，且周边竞争品牌加套餐，
 * 可能影响未来30天利润 —— 不是「营业额下降」空话。
 */
export type DecisionSignalV1 = {
  id: string;
  /** @deprecated 使用 id；保留兼容旧 DIE 字段名 */
  signalId: string;
  projectId: string;
  source: DecisionSignalSourceV1;
  type: DecisionSignalTypeV1;
  title: string;
  description: string;
  /** 0–1 */
  importance: number;
  urgency: "low" | "medium" | "high";
  relatedScope?: {
    brandName?: string;
    storeName?: string;
    city?: string;
    horizon?: DecisionHorizonV1;
  };
  evidenceIds: string[];
  /** 建议升格后的决策问题 */
  suggestedQuestion: string;
  observedAt: string;
  status: DecisionSignalStatusV1;
  candidateId?: string;
  decisionCaseId?: string;
};

/** 兼容旧 DIE 瘦 Signal（title←signal） */
export function toLegacyDieSignalShape(s: DecisionSignalV1): {
  signalId: string;
  projectId: string;
  signal: string;
  impact: string;
  confidence: number;
  urgency: "low" | "medium" | "high";
  evidenceIds: string[];
  suggestedQuestion: string;
  observedAt: string;
  status: "open" | "opened_case" | "dismissed" | "merged";
  decisionCaseId?: string;
} {
  const status =
    s.status === "candidate" || s.status === "open"
      ? "open"
      : s.status === "opened_case"
        ? "opened_case"
        : s.status === "merged"
          ? "merged"
          : "dismissed";
  return {
    signalId: s.signalId || s.id,
    projectId: s.projectId,
    signal: s.title,
    impact: s.description,
    confidence: s.importance,
    urgency: s.urgency,
    evidenceIds: s.evidenceIds,
    suggestedQuestion: s.suggestedQuestion,
    observedAt: s.observedAt,
    status,
    decisionCaseId: s.decisionCaseId,
  };
}
