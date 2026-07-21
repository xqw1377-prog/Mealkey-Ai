/**
 * Business Signal Engine V1 — Web/雷达 UI 兼容契约
 * 协议 SSOT：@mealkey/business-signal-engine + docs/BUSINESS_SIGNAL_ENGINE_V1.md
 * 本文件小写 type / decide|watch|positive 为雷达 UI 别名，非协议真源。
 */

export type BusinessSignalTypeV1 =
  | "customer"
  | "business"
  | "market"
  | "brand"
  | "organization";

export type EvidenceChainKindV1 =
  | "internal_fact"
  | "external_intel"
  | "inference";

export type EvidenceChainStepV1 = {
  order: number;
  kind: EvidenceChainKindV1;
  claim: string;
  sourceRef?: string;
};

export type SignalScoreBreakdownV1 = {
  impact: number; // 1–10
  urgency: number;
  trust: number;
  relevance: number;
  /** impact × urgency × trust × relevance */
  rankScore: number;
};

export type BusinessSignalV1 = {
  id: string;
  type: BusinessSignalTypeV1;
  title: string;
  observation: string;
  /** L2 模式（协议五层） */
  pattern?: string;
  /** L3 意义（协议五层） */
  meaning?: string;
  /** 展示用判断句；优先 = meaning */
  judgment: string;
  impact: string;
  suggestion: string;
  severity: "decide" | "watch" | "positive";
  scores: SignalScoreBreakdownV1;
  evidenceChain: EvidenceChainStepV1[];
  importanceStars: 1 | 2 | 3 | 4 | 5;
  href: string;
  ctaLabel: string;
  decisionTopic?: string;
};

export const SIGNAL_TYPE_LABEL: Record<BusinessSignalTypeV1, string> = {
  customer: "顾客",
  business: "生意",
  market: "竞争",
  brand: "品牌",
  organization: "组织",
};

/** 首页门槛：低于此分且非 positive → 不进首页其他变化 */
export const RADAR_HOME_RANK_FLOOR = 800;
