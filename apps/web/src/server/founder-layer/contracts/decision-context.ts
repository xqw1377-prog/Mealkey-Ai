/**
 * Decision Context — 兼容出口
 * SSOT：decision-intelligence-data-contract.ts
 */

export type {
  DecisionContextV1,
  DecisionEvidenceV1,
  DecisionFactV1,
  EvidenceSourceV1,
  EvidenceImpactV1,
  EvidenceSourceTrustBandV1,
  DecisionHistorySliceV1,
  DecisionConfidenceModelV1,
  DecisionAssessmentV1,
  DecisionOptionV1,
  ExpertOpinionSliceV1,
  RiskSliceV1,
  CouncilDecisionInputV1,
  DecisionInfoMapV1,
  SimilarDecisionMatchV1,
  CounterfactualV1,
  DecisionSimulationV1,
} from "./decision-intelligence-data-contract";

export {
  CONTEXT_OUTCOME_KEY,
  EVIDENCE_SOURCE_TRUST,
  EVIDENCE_SOURCE_TO_TRUST_BAND,
} from "./decision-intelligence-data-contract";
