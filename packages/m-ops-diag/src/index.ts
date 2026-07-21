export {
  M_OPS_DIAG_AGENT_ID,
  M_OPS_DIAG_PRODUCT_NAME,
  M_OPS_DIAG_PRODUCT_NAME_FULL,
  type DiagnosisEvidenceItem,
  type DiagnosisFact,
  type DiagnosisFinding,
  type DiagnosisFocus,
  type DiagnosisGap,
  type DiagnosisHorizon,
  type DiagnosisInsight,
  type DiagnosisSignal,
  type DiagnosisSignalSeverity,
  type RestaurantDiagnosisContext,
  type RestaurantDiagnosisRequest,
  type RestaurantDiagnosisResult,
} from "./contracts";

export { mOpsDiagManifest } from "./manifest";
export {
  mOpsDiagEngine,
  diagnoseRestaurantSync,
  runRestaurantDiagnosis,
} from "./engine";
export { toVerticalInsightSource, type VerticalInsightSourceDraft } from "./adapters";
export { mockConsumerEvidence, mockDiagnosisRequest } from "./mock";
export {
  buildDiagnosisRequest,
  contextFromBrainLike,
  evidenceFromRipLike,
  type BrainContextLike,
  type RipEvidenceLike,
} from "./from-context";
export {
  diagnosisSignalsToWorldHints,
  type OpsDiagWorldHint,
} from "./to-world-hints";
