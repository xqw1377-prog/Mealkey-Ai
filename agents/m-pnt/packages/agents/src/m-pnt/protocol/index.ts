/**
 * M-PNT Protocol V1
 *
 * V1 协议层：规范化结构化载荷、记忆回写、统一输出。
 * 不改变 Frozen Protocols，仅在其上扩展。
 */
export {
  readStructuredPayload,
  createStructuredEvidence,
  extractTag,
} from "./structured-payload";

export type {
  StructuredPayloadTag,
  StructuredPayload,
  CategoryAnalysisPayload,
  CustomerPortraitPayload,
  PricePositioningPayload,
  CompetitorAnalysisPayload,
  DifferentiationPayload,
  FinalPayload,
} from "./structured-payload";

export {
  PositioningMemoryWriter,
} from "./memory-contract";

export type {
  PositioningMemoryEntry,
} from "./memory-contract";

// 保持 V0 兼容
export {
  mapFinalJsonToMKDecision,
  fuseStepDecisions,
  decisionToPageOutput,
  readStructured,
} from "./mk-decision-mapper";

export type {
  PositioningPageOutput,
  PositioningFinalJson,
} from "./mk-decision-mapper";
