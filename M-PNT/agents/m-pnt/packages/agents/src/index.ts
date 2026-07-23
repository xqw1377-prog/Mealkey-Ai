import type { AgentDefinition } from "@mealkey/agent-sdk";
import { MPntAgent } from "./m-pnt";

/**
 * @mealkey/agents — MealKey 专项 Agent 注册
 *
 * 在 MealKey monorepo 中与 LaunchAgent 并列注册：
 *   import { LaunchAgent, MPntAgent } from "@mealkey/agents";
 *   export const allAgents = [LaunchAgent, MPntAgent];
 */
export const allAgents: AgentDefinition[] = [MPntAgent];

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
  decisionToPageOutput,
  detectPositioningIntent,
  mapPositioningProblem,
  mPntKnowledgeSeeds,
  runMPnt,
  listMPntCapabilityIds,
  readStructured,
  createMockLlm,
  setMPntOptions,
  clearMPntOptions,
  withMealKeyLlm,
  parseLlmToMKDecision,
} from "./m-pnt";
export type {
  MPntRunResult,
  MPntRunOptions,
  LLMAdapter,
  MPntLlmOptions,
} from "./m-pnt";
