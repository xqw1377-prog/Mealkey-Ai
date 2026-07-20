/**
 * Decision Intelligence Data Contract V1 — SSOT
 * 权威：docs/MEALKEY_DECISION_INTELLIGENCE_DATA_CONTRACT_V1.md
 * 技术映射：docs/MEALKEY_DECISION_INTELLIGENCE_TECH_MAP_V1.md
 *
 * DecisionCase.id ≡ MKDecision.id ≡ Prisma Decision.id
 */

import type {
  DecisionDataGapV1,
  RestaurantStateV1,
} from "./decision-intel-data";

export type SuccessBandV1 = "unknown" | "low" | "medium" | "high";

// ─── 1. DecisionCase ───────────────────────────────────────────

export type DecisionTypeV1 =
  | "GROWTH"
  | "OPERATION"
  | "PRODUCT"
  | "MARKETING"
  | "ORGANIZATION"
  | "FINANCE";

export type DecisionUrgencyV1 = "LOW" | "MEDIUM" | "HIGH";

export type DecisionCaseStatusV1 =
  | "DISCOVERED"
  | "ANALYZING"
  | "DELIBERATING"
  | "DECIDED"
  | "EXECUTING"
  | "LEARNING";

export type DecisionCaseV1 = {
  id: string;
  schemaVersion: 1;
  projectId: string;
  ownerId: string;
  ownerLabel: string;
  title: string;
  question: string;
  objective: string;
  decisionType: DecisionTypeV1;
  urgency: DecisionUrgencyV1;
  status: DecisionCaseStatusV1;
  deadline?: string;
  impactStars: 1 | 2 | 3 | 4 | 5;
  signalId?: string;
  contextId?: string;
  selectedOptionId?: string;
  packageId?: string;
  assessmentId?: string;
  createdAt: string;
  updatedAt: string;
};

// ─── 3. Evidence ───────────────────────────────────────────────

export type EvidenceSourceV1 =
  | "POS"
  | "OWNER_INPUT"
  | "EXTERNAL"
  | "MEMORY"
  | "CASE";

export type EvidenceImpactV1 = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

export type EvidenceSourceTrustBandV1 =
  | "owner_subjective"
  | "owner_pulse"
  | "ugc"
  | "historical_case"
  | "external_monitor"
  | "pos_system"
  | "brain_fact"
  | "validation_result";

export type DecisionEvidenceV1 = {
  id: string;
  decisionId?: string;
  source: EvidenceSourceV1;
  content: string;
  impact: EvidenceImpactV1;
  /** 0–1 */
  confidence: number;
  freshness: number;
  weight: number;
  relatedFactors: string[];
  createdAt: string;
  available: boolean;
  sourceTrustBand: EvidenceSourceTrustBandV1;
};

export type DecisionFactV1 = {
  factId: string;
  label: string;
  value: string;
  source: EvidenceSourceV1;
  asOf?: string;
};

// ─── 4. Option ─────────────────────────────────────────────────

export type DecisionOptionV1 = {
  id: string;
  decisionId: string;
  name: string;
  description: string;
  expectedBenefit: string;
  requiredResources: string[];
  riskLevel: SuccessBandV1;
  successProbabilityBand: SuccessBandV1;
  successProbabilityRationale: string;
  executionDifficulty: SuccessBandV1;
  simulationId?: string;
  isRecommended?: boolean;
};

// ─── 5. Simulation ─────────────────────────────────────────────

export type SimulationStageV1 = {
  stage: string;
  outcome: string;
  risk: string;
};

export type DecisionSimulationV1 = {
  id: string;
  optionId: string;
  decisionId: string;
  timeRange: string;
  scenarios: SimulationStageV1[];
  probabilityBand: SuccessBandV1;
  probabilityRange?: { low: number; high: number };
  rationale: string;
};

// ─── 6. Assessment ─────────────────────────────────────────────

export type DecisionAssessmentV1 = {
  id: string;
  decisionId: string;
  kind: "pre" | "post";
  confidenceScore: number;
  informationCompleteness: number;
  riskScore: number;
  executionScore: number;
  councilAgreement: number;
  reasoningQuality: number;
  topRisk?: string;
  unknownFactors: string[];
  suggestion:
    | "proceed"
    | "proceed_with_conditions"
    | "defer"
    | "need_more_evidence";
  rationale: string[];
  computedAt: string;
};

export type DecisionConfidenceModelV1 = {
  caseId: string;
  total: number;
  breakdown: {
    factCompleteness: number;
    externalInformation: number;
    historicalMatch: number;
    riskUnknown: number;
  };
  unknownFactors: string[];
  refuseDeepJudgement: boolean;
};

export type DecisionScoreDeltaV1 = {
  caseId: string;
  preAssessmentId: string;
  postAssessmentId: string;
  deltaTotal: number;
  errorSummary: string;
};

// ─── 7. Learning ───────────────────────────────────────────────

export type DecisionLearningV1 = {
  id: string;
  decisionId: string;
  projectId: string;
  prediction: string;
  actualResult: string;
  difference: string;
  insight: string;
  pattern: string;
  confidence: number;
  preScoreTotal?: number;
  postScoreTotal?: number;
  createdAt: string;
  brainLearningId?: string;
};

export type DecisionLearningRecordV1 = DecisionLearningV1;

// ─── Trace / affiliates ────────────────────────────────────────

export type DecisionTraceV1 = {
  decisionId: string;
  factsUsed: string[];
  optionsRejected: Array<{ optionId: string; reason: string }>;
  challenges: Array<{ roleId: string; claim: string }>;
  founderChoice: string;
  founderOverrideReason?: string;
  at: string;
};

/** Signal SSOT → decision-signal.ts（Experience 加厚） */
export type {
  DecisionSignalV1,
  DecisionSignalSourceV1,
  DecisionSignalTypeV1,
  DecisionSignalStatusV1,
} from "./decision-signal";
export { toLegacyDieSignalShape } from "./decision-signal";

export type SimilarDecisionMatchV1 = {
  matchedCaseId: string;
  similarity: number;
  question: string;
  outcome: "success" | "partial" | "fail" | "unknown";
  lesson: string;
  effectivenessBand: SuccessBandV1;
};

export type CounterfactualV1 = {
  caseId: string;
  optionId: string;
  failureModes: Array<{
    label: string;
    shareBand: SuccessBandV1;
    sharePercent?: number;
  }>;
  gates: string[];
  founderPrompt: string;
};

export type DecisionPackageV1 = {
  packageId: string;
  caseId: string;
  decision: string;
  objective: string;
  actions: Array<{
    title: string;
    owner?: string;
    dueInDays?: number;
  }>;
  metrics: Array<{
    name: string;
    target: string;
  }>;
  deadline?: string;
};

export type DecisionHistorySliceV1 = {
  label: string;
  summary: string;
  outcome?: string;
  sourceLabel: string;
};

export type ExpertOpinionSliceV1 = {
  roleId: string;
  stance: "support" | "oppose" | "conditional" | "observe";
  claim: string;
  challengeTo?: string;
};

export type RiskSliceV1 = {
  label: string;
  severity: "low" | "medium" | "high" | "critical";
  ownerRole?: string;
};

export type DecisionInfoMapV1 = {
  topicFamily:
    | "expansion"
    | "pricing"
    | "product"
    | "marketing"
    | "org"
    | "other";
  weights: Record<string, number>;
  elevatedByAsk: boolean;
  /** M-INTEL：brand+city 是否齐；无则禁止区域结论 */
  mintelAnchorsReady?: boolean;
};

export type CouncilDecisionInputV1 = {
  decisionQuestion: string;
  originalQuestion: string;
  restaurantSnapshot: {
    stage: string;
    revenueTrend: string;
    profitTrend: string;
    organizationHealth: string;
    ownerRisk: string;
  };
  keyEvidence: Array<{ label: string; claim: string }>;
  keyEvents: Array<{ title: string; impact: string }>;
  constraints: string[];
  successLooksLike: string[];
  lessonLine?: string;
};

export type ProblemFrameV1 = {
  originalQuestion: string;
  reframedQuestion: string;
  notTheQuestion?: string;
  subQuestions: string[];
  framingConfidence: number;
  evidenceRefs: string[];
};

export type DecisionChallengeV1 = {
  selectedOptionId: string;
  failureModes: Array<{
    ownerRole: string;
    claim: string;
    severity: "low" | "medium" | "high" | "critical";
  }>;
  founderMustAnswer: string;
  acknowledged?: boolean;
  acknowledgedAt?: string;
  founderReason?: string;
};

// ─── 2. Context ────────────────────────────────────────────────

export type DecisionContextV1 = {
  contextId: string;
  schemaVersion: 1;
  decisionId: string;
  projectId: string;
  updatedAt: string;
  facts: DecisionFactV1[];
  evidences: DecisionEvidenceV1[];
  restaurantState: RestaurantStateV1;
  historicalDecisions: DecisionHistorySliceV1[];
  similarMatches: SimilarDecisionMatchV1[];
  constraints: string[];
  assumptions: string[];
  /** 高级：系统不知道什么 */
  unknowns: string[];
  options: DecisionOptionV1[];
  simulations: DecisionSimulationV1[];
  assessment?: DecisionAssessmentV1;
  recommendation?: {
    optionId: string;
    line: string;
    preconditions: string[];
  };
  councilInput?: CouncilDecisionInputV1;
  expertOpinions: ExpertOpinionSliceV1[];
  risks: RiskSliceV1[];
  counterfactual?: CounterfactualV1;
  infoMap: DecisionInfoMapV1;
  openGaps: DecisionDataGapV1["gaps"];
  confidence?: DecisionConfidenceModelV1;
};

export type DecisionIntelligenceRunV1 = {
  decisionId: string;
  projectId: string;
  frame: ProblemFrameV1;
  options: DecisionOptionV1[];
  simulations: DecisionSimulationV1[];
  assessment: DecisionAssessmentV1;
  trace?: DecisionTraceV1;
  recommendationLine: string;
  packagePreview?: DecisionPackageV1;
};

export const DIE_OUTCOME_KEY = "die" as const;
export const CASE_OUTCOME_KEY = "case" as const;
export const CONTEXT_OUTCOME_KEY = "contextSnapshot" as const;
export const SCORES_OUTCOME_KEY = "scores" as const;
export const TRACE_OUTCOME_KEY = "trace" as const;

export type MkDecisionOutcomeDieBundleV1 = {
  [CASE_OUTCOME_KEY]?: DecisionCaseV1;
  [DIE_OUTCOME_KEY]?: DecisionIntelligenceRunV1;
  [CONTEXT_OUTCOME_KEY]?: DecisionContextV1;
  [SCORES_OUTCOME_KEY]?: {
    pre?: DecisionAssessmentV1;
    post?: DecisionAssessmentV1;
    delta?: DecisionScoreDeltaV1;
  };
  [TRACE_OUTCOME_KEY]?: DecisionTraceV1;
};

export const EVIDENCE_SOURCE_TRUST: Record<EvidenceSourceTrustBandV1, number> =
  {
    owner_subjective: 0.3,
    owner_pulse: 0.55,
    ugc: 0.75,
    historical_case: 0.7,
    external_monitor: 0.7,
    pos_system: 0.9,
    brain_fact: 0.8,
    validation_result: 0.85,
  };

export const EVIDENCE_SOURCE_TO_TRUST_BAND: Record<
  EvidenceSourceV1,
  EvidenceSourceTrustBandV1
> = {
  POS: "pos_system",
  OWNER_INPUT: "owner_pulse",
  EXTERNAL: "external_monitor",
  MEMORY: "brain_fact",
  CASE: "historical_case",
};
