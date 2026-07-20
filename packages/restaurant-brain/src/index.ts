export type {
  ActionMemory,
  ActionRecord,
  AgentRestaurantContext,
  BrandDnaFields,
  BrandProfile,
  BusinessContext,
  BusinessProfile,
  CapabilityProfile,
  DecisionRecord,
  DecisionRecordStatus,
  DnaLayer,
  DnaSource,
  EvolutionState,
  FounderProfile,
  LearningMemory,
  LearningRecord,
  Restaurant,
  RestaurantBrainSnapshot,
  RestaurantProfile,
  RestaurantStage,
  RestaurantStatus,
} from "./domain/types";

export {
  LAYER_KEYS,
  computeCompleteness,
  computeDataCompleteness,
  listUnknownKeys,
  listUnknowns,
  scoreBrand,
  scoreBusiness,
  scoreCapability,
  scoreFounder,
  scoreRestaurantProfile,
} from "./domain/completeness";

export type { MealkeyLocale } from "./i18n/locales";
export { DEFAULT_LOCALE, normalizeLocale } from "./i18n/locales";
export {
  UNKNOWN_FIELD_KEYS,
  labelUnknownField,
  labelUnknownFields,
} from "./i18n/unknown-field-labels";
export type { UnknownFieldKey } from "./i18n/unknown-field-labels";

export {
  createEmptyBrain,
  emptyBrand,
  emptyBusiness,
  emptyBusinessContext,
  emptyCapability,
  emptyCapabilityProfile,
  emptyDna,
  emptyEvolution,
  emptyEvolutionState,
  emptyFounder,
  emptyProfile,
  thinStartBrand,
} from "./domain/empty";

export type { DnaPatchPropose } from "./events/memory-event";
export {
  DNA_MERGE_MIN_CONFIDENCE,
  shouldAcceptDnaPatch,
} from "./events/memory-event";

export type {
  DecisionMemoryUpsert,
  DecisionMemoryValidated,
  LearningEvolutionHint,
} from "./events/decision-event";

export { BrainEventType } from "./events/brain-event";
export type { BrainEvent } from "./events/brain-event";
export type { BrainEventType as BrainEventTypeUnion } from "./events/brain-event";

export type { RestaurantContext } from "./context/context-types";
export type { AgentRestaurantContext as RestaurantBrainContext } from "./domain/types";
export {
  buildPriorBlock,
  buildRestaurantContext,
  deriveActiveRisks,
  deriveGrowthOpportunities,
  toBrainContext,
} from "./context/context-builder";

export type { MergeResult } from "./evolution/engine";
export { applyLearning, mergeDnaPatch } from "./evolution/engine";
export { recomputeEvolution } from "./evolution/recompute";
export type {
  EvolutionEngine,
  EvolutionTickResult,
} from "./evolution/interface";

export type { DetectedPattern } from "./evolution/pattern-detector";
export { detectExpansionRiskPattern } from "./evolution/pattern-detector";

export type {
  CreateActionMemoryInput,
  CreateLearningMemoryInput,
  RestaurantBrainMemoryApi,
  UpsertBusinessContextInput,
  UpsertCapabilityInput,
} from "./api/memory-api";

export type {
  LoadBrainContextInput,
  RestaurantBrainContextApi,
} from "./api/context-api";

export type { RestaurantBrainService } from "./service/restaurant-brain-service";
