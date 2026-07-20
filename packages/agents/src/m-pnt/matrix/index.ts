/**
 * M-PNT 三席思维矩阵（对外去真名）
 *
 *   | Agent            | 席位代号        | 学派标签         |
 *   |------------------|-----------------|------------------|
 *   | riesAgent        | MK-MIND 心智官  | 心智第一 · 聚焦  |
 *   | troutAgent       | MK-RIVAL 空位官 | 竞争空位 · 区隔  |
 *   | yeMaozhongAgent  | MK-CLASH 冲突官 | 冲突记忆 · 成交  |
 *
 * 咨询主路径：matrix/thinking 三席引擎造策 → Cross-Fire → Synthesis
 */

export type {
  TheoryAgentId,
  TheoryRecommend,
  DecisionRecommend,
  RiskLevel,
  PositionCandidate,
  MatrixInputPackage,
  TheoryView,
  CrossFireResult,
  TheoryChallenge,
  SynthesisResult,
  TheoryMatrixResult,
  TheoryAgent,
  TheoryLLMAdapter,
  DirectionScore,
  TheoryRisk,
} from "./types";

export { buildMatrixInputPackage } from "./input-package";
export {
  theoryAgents,
  theoryAgentMap,
  getTheoryAgent,
  riesAgent,
  troutAgent,
  yeMaozhongAgent,
  runCrossFireAgent,
  runSynthesisAgent,
} from "./agents";
export { runTheoryMatrix, runSingleTheoryAgent } from "./run-matrix";
export {
  runThreeSeatThinkingEngines as runSevenSeatThinkingEngines,
  runThreeSeatThinkingEngines,
  buildThinkingFactPack,
  SEAT_PUBLIC,
} from "./thinking";
export {
  runMindEngine,
  runRivalEngine,
  runClashEngine,
  runSymbolEngine,
  runSTPEngine,
  runGrowthEngine,
  runCultureEngine,
} from "./thinking";
export type {
  ThinkingFactPack,
  SeatVerdict,
  ThinkingEngineResult,
  SeatCode,
  SeatAdvisorId,
} from "./thinking/protocol";

export {
  KNOWLEDGE_STATS,
  getTheoryKnowledge,
  getRules,
  getCases,
  matchRulesToText,
  rulesToLawChecks,
  riesRules,
  troutRules,
  yeRules,
  caseAssets,
} from "./knowledge";
export type { TheoryRule, CaseAsset, TheorySource } from "./knowledge";
