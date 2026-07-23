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
  decisionToPageOutput,
} from "./protocols/mk-decision-mapper";
export type { PositioningPageOutput } from "./protocols/mk-decision-mapper";
export {
  detectPositioningIntent,
  mapPositioningProblem,
} from "./protocols/intent-detector";
export { mPntKnowledgeSeeds } from "./knowledge/seeds";
export { runMPnt, listMPntCapabilityIds, readStructured } from "./runtime";
export type { MPntRunResult, MPntRunOptions } from "./runtime";
export { runMPntUnified, MPntOutput, MPntUnifiedOptions } from "./runtime";
export type { MPntRuntimeConfig } from "@mealkey/agent-sdk";
export {
  createMockLlm,
  setMPntOptions,
  clearMPntOptions,
  withMealKeyLlm,
  parseLlmToMKDecision,
} from "./llm";
export type { LLMAdapter, MPntLlmOptions } from "./llm";
