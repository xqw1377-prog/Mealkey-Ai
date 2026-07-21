/**
 * BusinessSignal 协议 SSOT
 * 权威：docs/BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1.md
 */

export type BusinessSignalTypeV1 =
  | "CUSTOMER"
  | "OPERATION"
  | "COMPETITION"
  | "BRAND"
  | "MARKET"
  | "ORGANIZATION";

/** @deprecated 映射为 OPERATION；勿新增 FINANCE 信号 */
export type LegacyFinanceAlias = "FINANCE";

export type BusinessSignalSeverityV1 =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type BusinessSignalStatusV1 =
  | "detected"
  | "surfaced"
  | "investigating"
  | "promoted_case"
  | "dismissed"
  | "merged"
  | "resolved";

export type BusinessSignalSubjectV1 = {
  brand?: string;
  store?: string;
  region?: string;
};

export type EvidenceKindV1 =
  | "internal_fact"
  | "external_intel"
  | "inference";

export type BusinessSignalEvidenceItemV1 = {
  source: string;
  fact: string;
  kind: EvidenceKindV1;
  sourceRef?: string;
  observedAt?: string;
  weightHint?: number;
};

export type SignalScoreBreakdownV1 = {
  impact: number;
  urgency: number;
  /** 1–10 证据置信（契约主字段） */
  confidence: number;
  relevance: number;
  rankScore: number;
  /** @deprecated 同 confidence */
  trust?: number;
};

export type BusinessSignalV1 = {
  id: string;
  schemaVersion: 1;
  projectId?: string;
  subject: BusinessSignalSubjectV1;
  type: BusinessSignalTypeV1;
  severity: BusinessSignalSeverityV1;
  status: BusinessSignalStatusV1;
  title: string;
  /** L1 观察 */
  observation: string;
  /** L2 模式 */
  pattern: string;
  /** L3 意义 */
  meaning: string;
  /** @deprecated 同 meaning */
  insight?: string;
  /** L4 影响 */
  impact: string;
  /** L5 行动 */
  recommendation: string;
  evidence: BusinessSignalEvidenceItemV1[];
  confidence: number;
  scores: SignalScoreBreakdownV1;
  probeQuestions?: string[];
  decisionTopic?: string;
  suggestedQuestion?: string;
  decisionCaseId?: string;
  href?: string;
  sourceRefs?: {
    brainContextId?: string;
    mintelEvidenceIds?: string[];
    worldChangeIds?: string[];
    dieSignalId?: string;
  };
  createdAt: string;
  updatedAt?: string;
  observedWindow?: { from: string; to: string };
};

/** V1 首页三大雷达 */
export const V1_HOME_RADAR_TYPES: BusinessSignalTypeV1[] = [
  "CUSTOMER",
  "COMPETITION",
  "OPERATION",
];

export const SIGNAL_TYPE_LABEL_ZH: Record<BusinessSignalTypeV1, string> = {
  CUSTOMER: "顾客",
  OPERATION: "经营",
  COMPETITION: "竞争",
  BRAND: "品牌",
  MARKET: "市场",
  ORGANIZATION: "组织",
};

export const RADAR_HOME_RANK_FLOOR = 800;
export const RADAR_HOME_OTHERS_MAX = 3;
export const RADAR_NON_HOME_PROMOTE_FLOOR = 3500;

/** 规范化旧 FINANCE → OPERATION */
export function normalizeSignalType(
  t: BusinessSignalTypeV1 | LegacyFinanceAlias | string,
): BusinessSignalTypeV1 {
  if (t === "FINANCE") return "OPERATION";
  if (
    t === "CUSTOMER" ||
    t === "OPERATION" ||
    t === "COMPETITION" ||
    t === "BRAND" ||
    t === "MARKET" ||
    t === "ORGANIZATION"
  ) {
    return t;
  }
  return "CUSTOMER";
}
