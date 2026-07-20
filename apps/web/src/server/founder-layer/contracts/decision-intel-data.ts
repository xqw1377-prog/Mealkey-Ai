/**
 * M-INTEL = Decision Evidence Engine V1
 * 权威：docs/MEALKEY_M_INTEL_V1.md · DIE V1
 *
 * 流水线：Raw → Information → Event → Impact → Decision Evidence
 * 禁止：爬虫资讯产品、战略终局、顾问席
 */

export type TrendV1 = "up" | "flat" | "down" | "unknown";

/** 经营状态模型（理解，非报表） */
export type RestaurantStateV1 = {
  asOf: string;
  confidence: number;
  dimensions: {
    growth: number | null;
    profitability: number | null;
    customer: number | null;
    product: number | null;
    organization: number | null;
    finance: number | null;
    ownerCapability: number | null;
  };
  trends: Partial<
    Record<
      | "growth"
      | "profitability"
      | "customer"
      | "product"
      | "organization"
      | "finance"
      | "ownerCapability",
      TrendV1
    >
  >;
  flags: string[];
  sourceMix: Array<"owner_pulse" | "system_sync" | "ai_probe" | "brain">;
  /** @deprecated 兼容旧投影；优先用 dimensions */
  businessStage?: "startup" | "growth" | "expansion" | "stable" | "unknown";
};

export type IntelligenceEventDomainV1 =
  | "internal"
  | "category"
  | "competition"
  | "consumer"
  | "policy"
  | "trade_area"
  | "benchmark";

export type IntelligenceEventV1 = {
  eventId: string;
  kind: string;
  title: string;
  object: string;
  impact: string;
  impactDirection: "positive" | "negative" | "mixed" | "neutral";
  impactMetrics: string[];
  relatedDecisions: string[];
  confidence: number;
  domain: IntelligenceEventDomainV1;
  sourceLabel: string;
  observedAt: string;
  rawRef?: string;
};

export type DnaOnboardingLayerV1 = "basics" | "capability" | "founder";

export type DnaOnboardingAnswerV1 = {
  layer: DnaOnboardingLayerV1;
  questionId: string;
  value: string | number | boolean;
  band?: string;
};

export type DecisionDataGapV1 = {
  topic: string;
  gaps: Array<{
    gapId: string;
    question: string;
    reason: string;
    bandOptions?: string[];
  }>;
};

export type DailyDecisionBriefV1 = {
  projectId: string;
  asOf: string;
  changes: {
    internal: string[];
    external: string[];
    consumer: string[];
  };
  judgementLine: string;
  recommendedTopic: string;
  impactStars: 1 | 2 | 3 | 4 | 5;
  sourceLabels: string[];
  eventIds: string[];
  signalIds: string[];
};
