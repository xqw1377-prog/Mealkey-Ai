/**
 * @mealkey/agents
 *
 * MealKey Agent 产品矩阵
 *
 * 包含所有标准 Agent 产品定义。
 * 使用方式:
 *
 * ```typescript
 * import { allAgents, LaunchAgent, MPntAgent } from "@mealkey/agents";
 *
 * registry.registerBatch(allAgents);
 * ```
 */

import type { AgentDefinition } from "@mealkey/agent-sdk";
import { LaunchAgent } from "./launch";
import { MPntAgent } from "./m-pnt";

// ─── 所有 Agent 列表 ───

export const allAgents: AgentDefinition[] = [
  LaunchAgent,
  MPntAgent,
  // 后续添加:
  // LocationAgent,
  // MenuAgent,
  // RecruitAgent,
];

// ─── 单独导出 ───

export { LaunchAgent } from "./launch";
export { MPntAgent } from "./m-pnt";
export {
  mPntManifest,
  mPntWorkflow,
  mPntCapabilities,
  getCapability,
  M_PNT_SYSTEM_PROMPT,
  mPntReportTemplate,
  mapFinalJsonToMKDecision,
  fuseStepDecisions,
  detectPositioningIntent,
  mapPositioningProblem,
  mPntKnowledgeSeeds,
  runMPnt,
  listMPntCapabilityIds,
  readStructured,
  createMockLlm,
  setMPntLlmOptions,
  setMPntLlmWithTheory,
  clearMPntLlmOptions,
  withLlm,
  parseLlmToMKDecision,
  // 三理论 Agent 矩阵
  theoryAgents,
  theoryAgentMap,
  getTheoryAgent,
  riesAgent,
  troutAgent,
  yeMaozhongAgent,
  runTheoryMatrix,
  runSingleTheoryAgent,
  buildMatrixInputPackage,
} from "./m-pnt";
export type {
  MPntRunResult,
  MPntRunOptions,
  LLMAdapter,
  MPntLlmMode,
  MPntLlmOptions,
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
} from "./m-pnt";

// ─── 按分类查询 ───

export function getAgentsByCategory(category: string): AgentDefinition[] {
  return allAgents.filter((agent) => agent.manifest.category === category);
}

// ─── 按 ID 查询 ───

export function getAgentById(id: string): AgentDefinition | undefined {
  return allAgents.find((agent) => agent.manifest.id === id);
}

// ─── Agent ID 列表 ───

export const agentIds = allAgents.map((agent) => agent.manifest.id);
