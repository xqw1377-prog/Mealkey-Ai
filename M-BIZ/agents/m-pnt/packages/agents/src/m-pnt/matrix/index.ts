/**
 * M-PNT 三理论 Agent 矩阵
 *
 * 每一个理论体系 = 一个 Agent，相互竞争、相互博弈，最后形成共识/取舍：
 *
 *   | Agent            | 理论体系                         |
 *   |------------------|----------------------------------|
 *   | riesAgent        | Ries 定位理论（第一/聚焦/领导）   |
 *   | troutAgent       | Trout 区隔理论（竞争/第一联想）   |
 *   | yeMaozhongAgent  | 叶茂中场景落地理论（场景/可验证） |
 *
 * 流程：
 *   并行竞争出三票 → Cross-Fire 相互攻击（博弈）
 *   → 硬/软共识与淘汰 → Synthesis 最终取舍（非简单过半数）
 */

export type {
  TheoryAgentId,
  TheoryRecommend,
  DecisionRecommend,
  RiskLevel,
  MindPositionLevel,
  PositionCandidate,
  MatrixInputPackage,
  TheoryView,
  CrossFireResult,
  TheoryChallenge,
  SynthesisResult,
  TheoryMatrixResult,
  TheoryAgent,
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
