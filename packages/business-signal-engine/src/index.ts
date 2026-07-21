/**
 * @mealkey/business-signal-engine
 * 权威：docs/BUSINESS_SIGNAL_ENGINE_DATA_CONTRACT_V1.md
 *       docs/BUSINESS_SIGNAL_ENGINE_V1.md
 */

export type {
  BusinessSignalTypeV1,
  BusinessSignalSeverityV1,
  BusinessSignalStatusV1,
  BusinessSignalSubjectV1,
  BusinessSignalEvidenceItemV1,
  BusinessSignalV1,
  SignalScoreBreakdownV1,
  EvidenceKindV1,
  LegacyFinanceAlias,
} from "./types/signal";

export {
  V1_HOME_RADAR_TYPES,
  SIGNAL_TYPE_LABEL_ZH,
  RADAR_HOME_RANK_FLOOR,
  RADAR_HOME_OTHERS_MAX,
  RADAR_NON_HOME_PROMOTE_FLOOR,
  normalizeSignalType,
} from "./types/signal";

export type {
  DailyRadarOutputV1,
  DailyRadarHealthDimV1,
  DailyRadarHealthDimIdV1,
} from "./types/radar-output";

export { buildTodayOneThing } from "./types/radar-output";

export {
  hasMinimumEvidenceChain,
  hasFiveLayers,
  enforceEvidenceGate,
  evidenceToWhyLines,
} from "./evidence/evidence-chain";

export {
  computeRankScores,
  rankBusinessSignals,
  selectRadarSlice,
  severityFromScores,
  isPositiveSignal,
  type RadarSignalSliceV1,
} from "./ranking/signal-ranking";

export {
  analyzeHintToSignal,
  analyzeSignals,
  type SignalFactHintV1,
  type SignalAnalyzeInputV1,
} from "./analyzer/signal-analyzer";

export {
  INTELLIGENCE_LOOP_STAGES,
  INTELLIGENCE_LOOP_LABEL_ZH,
  type IntelligenceLoopStageV1,
} from "./loop/intelligence-loop";

export {
  canPromoteSignalToCase,
  toDecisionCaseDraft,
  markSignalPromoted,
  mapSignalTypeToDecisionType,
  mapSeverityToCaseUrgency,
  type SignalToCaseDraftV1,
  type SignalCaseDecisionTypeV1,
  type PromoteGateResultV1,
} from "./bridge/signal-to-case";
