export { mmktBlueprint } from "./blueprint";
export { thickenMarketScan, buildHeuristicMarketScan } from "./market-scan-engine";
export {
  attachEntrySchemes,
  buildMmktAdvisorsWithSchemes,
  buildEntrySchemeForSeat,
  resolveSceneCut,
} from "./entry-scheme-engine";
export {
  buildEntryDeliveryPack,
  buildMmktExecutionRoadmap,
} from "./entry-pack-engine";
export { buildOpportunityStrategyReport } from "./opportunity-strategy-report";
export {
  draftEntryContract,
  proposeEntryContract,
  freezeEntryContract,
} from "./entry-contract-engine";
export {
  assertMmktConfirmReady,
  assertDecisionArtifactReady,
  ensureWarRoomEntryContractDraft,
  finalizeSixStepEntryDeliverable,
} from "./six-step-finalize";
export {
  evaluateMmktSignOffReadiness,
  signMmktStrategyReport,
  buildMmktSignOffPackageMarkdown,
  mmktSignOffPackageFilename,
} from "./signoff-package";
export {
  toMMktExpertReport,
  toAgentConsultingExpertReport,
  hasAgentConsultingSubstance,
} from "../../consulting-os/expert-report-adapter";
export type {
  EntryScheme,
  EntryDeliveryPack,
  EntryContract,
  MarketScanScope,
  CompetitorBrief,
} from "./types";
export type {
  MmktSignOffCheck,
  MmktSignOffReadiness,
} from "./signoff-package";

export { toMMktExpertReportDeep } from "./expert-report-adapter";
export { toMMktMkInsights } from "./mk-insight-adapter";

export * from "./market-evidence-ledger";
export * from "./market-strength-engine";
export * from "./market-hypothesis-engine";
