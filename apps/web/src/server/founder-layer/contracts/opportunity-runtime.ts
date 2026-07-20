/**
 * Opportunity Runtime 契约 — 经营机会发现（非资讯聚合 / 非点子机）
 * 专篇：MEALKEY_OPPORTUNITY_RUNTIME_BACKEND_V1.md · O1
 */

export type OpportunityType =
  | "market"
  | "category"
  | "channel"
  | "product"
  | "business_model";

export type OpportunitySource =
  | "industry"
  | "memory"
  | "competitor"
  | "user"
  | "agent";

export type OpportunityStatus =
  | "detected"
  | "analyzing"
  | "approved"
  | "rejected"
  | "exploring";

export type OpportunitySuggestExpert =
  | "M-PNT"
  | "M-MKT"
  | "M-BIZ"
  | "M-ED";

/** 四因子，各 0–1 */
export type OpportunityScoreFactors = {
  marketAttractive: number;
  companyFit: number;
  executionCapability: number;
  timing: number;
};

export type Opportunity = {
  id: string;
  ownerId: string;
  projectId?: string;
  title: string;
  description: string;
  type: OpportunityType;
  source: OpportunitySource;
  /** 0–100 = 四因子乘积 ×100 */
  score: number;
  factors: OpportunityScoreFactors;
  /** 0–1 */
  confidence: number;
  status: OpportunityStatus;
  suggestExpert?: OpportunitySuggestExpert;
  suggestedTopic?: string;
  linkedDecisionId?: string;
  createdAt: string;
};

function clampUnit(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Opportunity Score =
 *   Market Attractive × Company Fit × Execution Capability × Timing × 100
 */
export function computeOpportunityScore(
  factors: OpportunityScoreFactors,
): number {
  const a = clampUnit(factors.marketAttractive);
  const f = clampUnit(factors.companyFit);
  const e = clampUnit(factors.executionCapability);
  const t = clampUnit(factors.timing);
  return Math.round(a * f * e * t * 1000) / 10;
}

/** score≥60 可标 exploring 候选进席；否则 detected */
export function suggestOpportunityStatusFromScore(
  score: number,
): Extract<OpportunityStatus, "detected" | "exploring"> {
  return score >= 60 ? "exploring" : "detected";
}

export function buildOpportunity(input: {
  id: string;
  ownerId: string;
  projectId?: string;
  title: string;
  description: string;
  type: OpportunityType;
  source: OpportunitySource;
  factors: OpportunityScoreFactors;
  confidence?: number;
  status?: OpportunityStatus;
  suggestExpert?: OpportunitySuggestExpert;
  suggestedTopic?: string;
  linkedDecisionId?: string;
  createdAt?: string;
}): Opportunity {
  const factors: OpportunityScoreFactors = {
    marketAttractive: clampUnit(input.factors.marketAttractive),
    companyFit: clampUnit(input.factors.companyFit),
    executionCapability: clampUnit(input.factors.executionCapability),
    timing: clampUnit(input.factors.timing),
  };
  const score = computeOpportunityScore(factors);
  const confidence = clampUnit(
    input.confidence !== undefined ? input.confidence : 0.6,
  );
  return {
    id: input.id,
    ownerId: input.ownerId,
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    type: input.type,
    source: input.source,
    score,
    factors,
    confidence,
    status: input.status || suggestOpportunityStatusFromScore(score),
    suggestExpert: input.suggestExpert,
    suggestedTopic: input.suggestedTopic,
    linkedDecisionId: input.linkedDecisionId,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}
