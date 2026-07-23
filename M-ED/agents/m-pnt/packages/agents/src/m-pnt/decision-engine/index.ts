/**
 * M-PNT Decision Engine V1
 *
 * 收敛分散的决策逻辑为可测试、可追踪的决策引擎。
 * 不改变任何外部接口，原有矩阵 / Agent 代码不受影响。
 */
export { DecisionEngine } from "./engine";
export { DecisionTraceCollector, getTraceCollector, resetTraceCollector } from "./trace";
export {
  DEFAULT_DIMENSIONS,
  DEFAULT_WEIGHTS,
  THEORY_WEIGHTS,
  getWeights,
  scoreMentalUniqueness,
  scoreCompetitiveStrength,
  scoreCustomerFit,
  scoreExecutability,
  scoreLongTermDefense,
  scoreRiskControllability,
} from "./score-card";

export type {
  DimensionId,
  DimensionDef,
  DimensionScore,
  DimensionTrace,
  DecisionTraceEntry,
  DecisionEngineConfig,
} from "./types";
