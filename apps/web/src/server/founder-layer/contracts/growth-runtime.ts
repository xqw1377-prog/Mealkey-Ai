/**
 * Growth Runtime 契约 — 创始人成长引擎（非 M-GROW 顾问席）
 */

export type CognitiveGapKind =
  | "ops_vs_strategy"
  | "traffic_vs_positioning"
  | "price_vs_model"
  | "execution_vs_judgement"
  | "unknown";

export type CognitiveGap = {
  gapId: string;
  kind: CognitiveGapKind;
  /** 老板可能的归因 */
  believedCause: string;
  /** 系统从结果看到的更可能根因 */
  likelyRootCause: string;
  summary: string;
  /** 建议回灌席位（仅建议） */
  suggestCommittee?: "brand" | "market" | "business" | "capital" | "council";
  createdAt: string;
};

export type DecisionPatternOutcome = "confirmed" | "partial" | "invalidated";

/** 单次决策质量模式（写入记忆，不改历史决策正文） */
export type DecisionPattern = {
  patternId: string;
  decisionId?: string;
  hypothesis: string;
  thenJudgement: string;
  actualSummary: string;
  outcome: DecisionPatternOutcome;
  lesson: string;
  createdAt: string;
};

export type GrowthPathItem = {
  title: string;
  stageHint: "early" | "scale" | "general";
  why: string;
};

/** G1 八维 */
export type FounderCapabilityDim =
  | "strategy"
  | "positioning"
  | "marketing"
  | "product"
  | "finance"
  | "organization"
  | "execution"
  | "learning";

export type FounderCapabilityScore = {
  dim: FounderCapabilityDim;
  label: string;
  score: number;
  confidence: number;
  note?: string;
  updatedAt: string;
};

/** G2 Decision Quality 30/30/40 */
export type DecisionQualityScore = {
  judgement: number;
  execution: number;
  result: number;
  total: number;
  weights: { judgement: 30; execution: 30; result: 40 };
  updatedAt: string;
};

/** G3 */
export type GrowthEventType =
  | "validation_completed"
  | "decision_pattern"
  | "cognitive_gap"
  | "capability_refresh";

export type GrowthEvent = {
  eventId: string;
  type: GrowthEventType;
  source: string;
  impact: string;
  summary: string;
  createdAt: string;
};

/** G4 */
export type GrowthTask = {
  taskId: string;
  capability: string;
  goal: string;
  status: "open" | "doing" | "done";
  suggestedTopic?: string;
  suggestExpert?: "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED";
  validation?: string;
  createdAt: string;
};

export type GrowthRuntimeSnapshot = {
  cognitiveGap: CognitiveGap | null;
  lastDecisionPattern: DecisionPattern | null;
  recentPatterns: DecisionPattern[];
  growthPath: GrowthPathItem[];
  weakestLabel?: string;
  weakestScore?: number;
  eightDim?: FounderCapabilityScore[];
  decisionQuality?: DecisionQualityScore | null;
  growthEvents?: GrowthEvent[];
  growthTasks?: GrowthTask[];
};
