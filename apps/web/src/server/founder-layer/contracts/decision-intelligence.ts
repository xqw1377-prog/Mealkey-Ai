/**
 * DIE 契约 — 兼容出口
 * SSOT：decision-intelligence-data-contract.ts
 */

export type {
  SuccessBandV1,
  DecisionTypeV1,
  DecisionUrgencyV1,
  DecisionCaseStatusV1,
  DecisionCaseV1,
  DecisionSignalV1,
  DecisionOptionV1,
  DecisionSimulationV1,
  DecisionAssessmentV1,
  DecisionLearningV1,
  DecisionLearningRecordV1,
  DecisionTraceV1,
  DecisionPackageV1,
  ProblemFrameV1,
  DecisionChallengeV1,
  DecisionIntelligenceRunV1,
  CounterfactualV1,
  SimilarDecisionMatchV1,
  DecisionConfidenceModelV1,
} from "./decision-intelligence-data-contract";

export {
  DIE_OUTCOME_KEY,
  CASE_OUTCOME_KEY,
  SCORES_OUTCOME_KEY,
  TRACE_OUTCOME_KEY,
  EVIDENCE_SOURCE_TRUST,
  EVIDENCE_SOURCE_TO_TRUST_BAND,
} from "./decision-intelligence-data-contract";

export type { MkDecisionOutcomeDieBundleV1 as MkDecisionOutcomeWithDie } from "./decision-intelligence-data-contract";
