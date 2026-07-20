/**
 * Business Identity V1 — 经营身份（非 Prisma 表）
 * 权威：docs/MEALKEY_DECISION_EXPERIENCE_V1.md
 */

export type BusinessScopeKind =
  | "store"
  | "brand"
  | "multi_brand"
  | "region";

/** Experience 文档枚举（大写）；运行时仍用 BusinessScopeKind */
export type BusinessScopeTypeV1 = "STORE" | "BRAND" | "COMPANY" | "REGION";

export function toScopeType(scope: BusinessScopeKind): BusinessScopeTypeV1 {
  if (scope === "store") return "STORE";
  if (scope === "brand") return "BRAND";
  if (scope === "multi_brand") return "COMPANY";
  return "REGION";
}

export function fromScopeType(t: BusinessScopeTypeV1): BusinessScopeKind {
  if (t === "STORE") return "store";
  if (t === "BRAND") return "brand";
  if (t === "COMPANY") return "multi_brand";
  return "region";
}

export type DecisionFocusKind =
  | "growth"
  | "profit"
  | "org"
  | "product"
  | "expansion";

/** 决策时间尺度 */
export type DecisionHorizonV1 = "short" | "mid" | "long";

export type DecisionReadinessStateV1 =
  | "ready"
  | "need_evidence"
  | "need_context"
  | "high_uncertainty";

export type BusinessIdentityV1 = {
  schemaVersion: 1;
  scope: BusinessScopeKind;
  objectName: string;
  brandName: string;
  city: string;
  district?: string;
  address?: string;
  storeCountBand: "1" | "2-5" | "5+";
  storeCountApprox: number;
  focus: DecisionFocusKind;
  /** 老板通常看多远 */
  decisionHorizon: DecisionHorizonV1;
  biggestProblem: string;
  externalIntelReady: boolean;
  completedAt: string;
  source: "identity_intake_v1";
};

export type DecisionReadinessV1 = {
  stars: 1 | 2 | 3 | 4 | 5;
  score: number;
  /** 状态优先于分数叙事 */
  state: DecisionReadinessStateV1;
  stateLabel: string;
  known: string[];
  missing: string[];
  canClaimExternalIntel: boolean;
  suggestionLine: string;
};

export const SCOPE_LABEL: Record<BusinessScopeKind, string> = {
  store: "一家店",
  brand: "一个品牌",
  multi_brand: "多个品牌",
  region: "区域市场",
};

export const FOCUS_LABEL: Record<DecisionFocusKind, string> = {
  growth: "增长",
  profit: "利润",
  org: "组织",
  product: "产品",
  expansion: "扩张",
};

export const HORIZON_LABEL: Record<DecisionHorizonV1, string> = {
  short: "短期（7–30 天）",
  mid: "中期（3–12 个月）",
  long: "长期（1–3 年）",
};

export const READINESS_STATE_LABEL: Record<DecisionReadinessStateV1, string> = {
  ready: "可以直接判断",
  need_evidence: "需要补充外部证据",
  need_context: "需要补充经营事实",
  high_uncertainty: "不确定性过高，建议暂缓",
};

export function parseLocationLine(raw: string): {
  city: string;
  district?: string;
  address?: string;
} {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t) return { city: "" };
  if (t.includes("·")) {
    const parts = t.split("·").map((s) => s.trim()).filter(Boolean);
    return {
      city: parts[0] || t,
      district: parts.slice(1).join(" · ") || undefined,
      address: t,
    };
  }
  const m = t.match(/^(.+?(?:省|市|自治区|自治州|地区|盟))(.*)$/);
  if (m) {
    return {
      city: m[1].trim(),
      district: m[2]?.trim() || undefined,
      address: t,
    };
  }
  return { city: t.slice(0, 40), address: t };
}

export function storeCountFromBand(band: "1" | "2-5" | "5+"): number {
  if (band === "1") return 1;
  if (band === "2-5") return 3;
  return 6;
}

export function identityExternalReady(id: Pick<
  BusinessIdentityV1,
  "brandName" | "city"
>): boolean {
  return Boolean(id.brandName?.trim() && id.city?.trim());
}

export function starsFromScore(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score >= 85) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 35) return 2;
  return 1;
}

export function deriveReadinessState(input: {
  score: number;
  missing: string[];
  canClaimExternalIntel: boolean;
  highRisk?: boolean;
}): DecisionReadinessStateV1 {
  if (input.highRisk || input.score < 35) return "high_uncertainty";
  if (!input.canClaimExternalIntel) return "need_evidence";
  const miss = input.missing.join(" ");
  if (
    input.missing.length > 0 &&
    (/事实|利润|店长|组织|经营|完整|Brain|趋势/i.test(miss) ||
      input.score < 55)
  ) {
    return "need_context";
  }
  if (input.missing.length > 0 && !input.canClaimExternalIntel) {
    return "need_evidence";
  }
  if (input.missing.length > 0) return "need_context";
  if (input.score >= 70) return "ready";
  if (input.score < 45) return "high_uncertainty";
  return "need_context";
}

export function buildDecisionReadiness(input: {
  score: number;
  known: string[];
  missing: string[];
  canClaimExternalIntel: boolean;
  highRisk?: boolean;
}): DecisionReadinessV1 {
  const score = Math.max(0, Math.min(100, Math.round(input.score)));
  const state = deriveReadinessState({
    score,
    missing: input.missing,
    canClaimExternalIntel: input.canClaimExternalIntel,
    highRisk: input.highRisk,
  });
  return {
    stars: starsFromScore(score),
    score,
    state,
    stateLabel: READINESS_STATE_LABEL[state],
    known: input.known.slice(0, 5),
    missing: input.missing.slice(0, 5),
    canClaimExternalIntel: input.canClaimExternalIntel,
    suggestionLine:
      state === "ready"
        ? "关键信息已较齐，可进入裁决"
        : "补充后：判断会更准确",
  };
}
