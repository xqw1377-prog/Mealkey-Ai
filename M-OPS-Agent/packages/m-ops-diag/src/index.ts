export {
  type DiagnosisCase,
  type DiagnosisCaseStatus,
  type DiagnosisDimension,
  type DiagnosisEvidenceRecord,
  type DiagnosisHypothesis,
  type DiagnosisLearning,
  type DiagnosisObservation,
  type DiagnosisPattern,
  type EvidenceSourceType,
  type ExternalScanJob,
  type RestaurantContextRecord,
} from "./knowledge";
export {
  type HealthDeltaDirection,
  type HealthDimension,
  type HealthDimensionState,
  type HealthLevel,
  M_OPS_DIAG_AGENT_ID,
  M_OPS_DIAG_PACKAGE_ID,
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
  type ExamAxisId,
  type ExamAxisResult,
  type ExamMetric,
  type ExamMetricSource,
  type ExamScorecardRow,
  type ExpertAnalysisCell,
  type ExpertOpinion,
  type ExpertRole,
  type ConsultationReport,
  type ReportModule,
  type ReportModuleId,
  type ReportModuleTable,
  type HealthMetricDelta,
  type RestaurantExamReport,
  type RestaurantHealthDeltaRecord,
  type RestaurantHealthModelResult,
  type RestaurantHealthSnapshot,
  type RestaurantDiagnosisContext,
  type RestaurantDiagnosisRequest,
  type RestaurantDiagnosisResult,
} from "./contracts";

export {
  advanceDiagnosisCase,
  buildExternalScanJob,
  buildLearningDraft,
  createDiagnosisCase,
} from "./lifecycle";
export { mOpsDiagManifest, mOpsAgentManifestV1 } from "./manifest";
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
export {
  claimMatchesTheme,
  getPatternLibrary,
  setPatternLibrary,
  resetPatternLibrary,
  matchPatternClaim,
  inferSentimentFromClaim,
  tagEvidenceFromText,
  type PatternRule,
} from "./reasoning/patterns";
export {
  buildEvolutionState,
  classifyLearningOutcome,
  evolvePatternLibraryFromLearnings,
  applyEvolvedPatternLibrary,
  enrichLearning,
  evolutionBiasForHypothesis,
  serializePatternLibrary,
  hydratePatternLibrary,
  stageLabel,
  type LearningPolarity,
  type EvolutionStage,
  type RestaurantEvolutionState,
  type ThemeWeight,
  type HypothesisPrior,
  type SerializablePatternRule,
} from "./reasoning/evolution";
export { rankHypotheses } from "./reasoning/hypothesis";
export { buildRestaurantExamReport, examGaps } from "./engines/exam-axes";
export { buildConsultationReport, buildBossBrief } from "./engines/council-report";
export {
  resolveCategoryThresholds,
  evaluateCategoryAlerts,
  CATEGORY_THRESHOLDS,
  type CategoryThresholds,
  type CategoryAlert,
} from "./engines/category-thresholds";
export {
  decomposeRevenueChange,
  mealContributionIndex,
  computeDishAbc,
  computePnL,
  professionalConfidence,
  enrichDishSalesWithMenu,
  type MenuItemCost,
  type DailyOpsRow,
  type DishSalesRow,
} from "./engines/diagnosis-math";
export {
  DATA_COLLECTION_CATALOG,
  assessDataReadiness,
  catalogByGroup,
  type DataFieldDef,
  type DataFieldGroup,
  type DataReadiness,
  type DataReadinessContext,
  type DataRequiredLevel,
} from "./data-catalog";
export {
  runFinanceOfficer,
  runProductOfficer,
  runMarketingOfficer,
  runExperienceOfficer,
  type ExpertCapabilityResult,
} from "./engines/expert-capabilities";
export {
  expertResultToAnalysis,
  mergeAnalyses,
} from "./engines/expert-bridge";
