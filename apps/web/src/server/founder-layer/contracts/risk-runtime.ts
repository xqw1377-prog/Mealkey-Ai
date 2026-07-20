/**
 * Risk Runtime 契约 — 企业风险雷达（非财务 ERP / 非顾问席）
 * 专篇：MEALKEY_RISK_RUNTIME_BACKEND_V1.md · R1
 */

export type RiskType =
  | "strategic"
  | "market"
  | "brand"
  | "business"
  | "financial"
  | "execution";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RiskAlertStatus = "open" | "reviewing" | "resolved";

export type RiskSuggestExpert = "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED";

export type RiskScoreFactors = {
  /** 发生概率 0–1 */
  probability: number;
  /** 影响强度 0–1 */
  impact: number;
  /** 暴露程度 0–1 */
  exposure: number;
};

export type RiskAlert = {
  id: string;
  ownerId: string;
  projectId: string;
  type: RiskType;
  level: RiskLevel;
  title: string;
  description: string;
  evidence: string[];
  source: string;
  /** 0–100 = P×I×E×100 */
  score: number;
  factors: RiskScoreFactors;
  suggestExpert?: RiskSuggestExpert;
  suggestCouncil?: boolean;
  suggestedTopic?: string;
  status: RiskAlertStatus;
  createdAt: string;
};

export type RiskEventType =
  | "detected"
  | "confirmed"
  | "mitigated"
  | "closed";

export type RiskEvent = {
  type: RiskEventType;
  riskId: string;
  source: string;
  timestamp: string;
};

const RISK_TYPES: readonly RiskType[] = [
  "strategic",
  "market",
  "brand",
  "business",
  "financial",
  "execution",
] as const;

export function isRiskType(value: string): value is RiskType {
  return (RISK_TYPES as readonly string[]).includes(value);
}

function clampUnit(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Risk Score = Probability × Impact × Exposure × 100 → 0–100
 */
export function computeRiskScore(factors: RiskScoreFactors): number {
  const p = clampUnit(factors.probability);
  const i = clampUnit(factors.impact);
  const e = clampUnit(factors.exposure);
  return Math.round(p * i * e * 1000) / 10;
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 20) return "medium";
  return "low";
}

/**
 * CRITICAL 必须有 evidence；无证据时最高降为 high。
 */
export function assertRiskEvidenceForLevel(
  level: RiskLevel,
  evidence: string[],
): RiskLevel {
  if (level === "critical" && evidence.filter(Boolean).length === 0) {
    return "high";
  }
  return level;
}

export function buildRiskAlert(input: {
  id: string;
  ownerId: string;
  projectId: string;
  type: RiskType;
  title: string;
  description: string;
  evidence?: string[];
  source: string;
  factors: RiskScoreFactors;
  suggestExpert?: RiskSuggestExpert;
  suggestCouncil?: boolean;
  suggestedTopic?: string;
  status?: RiskAlertStatus;
  createdAt?: string;
}): RiskAlert {
  const evidence = (input.evidence || []).map((e) => e.trim()).filter(Boolean);
  const score = computeRiskScore(input.factors);
  let level = riskLevelFromScore(score);
  level = assertRiskEvidenceForLevel(level, evidence);
  return {
    id: input.id,
    ownerId: input.ownerId,
    projectId: input.projectId,
    type: input.type,
    level,
    title: input.title,
    description: input.description,
    evidence,
    source: input.source,
    score,
    factors: {
      probability: clampUnit(input.factors.probability),
      impact: clampUnit(input.factors.impact),
      exposure: clampUnit(input.factors.exposure),
    },
    suggestExpert: input.suggestExpert,
    suggestCouncil: input.suggestCouncil,
    suggestedTopic: input.suggestedTopic,
    status: input.status || "open",
    createdAt: input.createdAt || new Date().toISOString(),
  };
}
