/**
 * M-PNT Agent - 餐饮定位顾问
 *
 * MealKey 标准 Agent 产品：品牌定位决策引擎。
 *
 * 产品组成:
 * - manifest / workflow / capabilities / prompt
 * - matrix: 三理论 Agent 矩阵（每一个理论 = 一个 Agent）
 *     riesAgent | troutAgent | yeMaozhongAgent
 *     → crossFire → synthesis
 */

import type { AgentDefinition } from "@mealkey/agent-sdk";
import { mPntCapabilities } from "./capabilities";
import { mPntManifest } from "./manifest";
import { M_PNT_SYSTEM_PROMPT } from "./prompts/system";
import { mPntReportTemplate } from "./reports/template";
import { mPntWorkflow } from "./workflow";

export const MPntAgent: AgentDefinition = {
  manifest: mPntManifest as AgentDefinition["manifest"],
  workflow: mPntWorkflow as AgentDefinition["workflow"],
  capabilities: mPntCapabilities,
  prompt: M_PNT_SYSTEM_PROMPT,
};

export { mPntManifest } from "./manifest";
export { mPntWorkflow } from "./workflow";
export { mPntCapabilities, getCapability } from "./capabilities";
export { M_PNT_SYSTEM_PROMPT } from "./prompts/system";
export { mPntReportTemplate } from "./reports/template";
export {
  mapFinalJsonToMKDecision,
  fuseStepDecisions,
  readStructured,
} from "./protocols/mk-decision-mapper";
export {
  detectPositioningIntent,
  mapPositioningProblem,
} from "./protocols/intent-detector";
export { mPntKnowledgeSeeds } from "./knowledge/seeds";
export { runMPnt, listMPntCapabilityIds } from "./runtime";
export type { MPntRunResult, MPntRunOptions } from "./runtime";
export {
  createMockLlm,
  setMPntLlmOptions,
  setMPntLlmWithTheory,
  clearMPntLlmOptions,
  withLlm,
  parseLlmToMKDecision,
} from "./llm";
export type { LLMAdapter, MPntLlmMode, MPntLlmOptions } from "./llm";

// ─── 三理论 Agent 矩阵（一理论 = 一 Agent）───
export {
  theoryAgents,
  theoryAgentMap,
  getTheoryAgent,
  riesAgent,
  troutAgent,
  yeMaozhongAgent,
  runCrossFireAgent,
  runSynthesisAgent,
  runTheoryMatrix,
  runSingleTheoryAgent,
  buildMatrixInputPackage,
} from "./matrix";
export type {
  TheoryAgentId,
  TheoryAgent,
  TheoryLLMAdapter,
  TheoryView,
  TheoryMatrixResult,
  MatrixInputPackage,
  CrossFireResult,
  SynthesisResult,
  PositionCandidate,
  TheoryRecommend,
  DecisionRecommend,
} from "./matrix";

// ─── V2 P0 咨询项目内核（状态机 / Brief / 定位合同）───
export * from "./consulting";
