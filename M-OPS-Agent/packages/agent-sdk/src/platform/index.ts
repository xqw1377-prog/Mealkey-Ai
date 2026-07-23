/**
 * MealKey Agent Platform SDK — docs/MEALKEY_AGENT_SDK_V1.md
 * External agents: Gateway only. No new vertical agents in this package.
 */

export { createAgentClient, type AgentPlatformClient } from "./client";
export { signal, insight, gap, work } from "./builders";
export { MkError, MkScopeError, MkAuthError } from "./errors";
export type {
  AgentClientConfig,
  ContextScope,
  ContextPackageV1,
  InsightLevel,
  SignalIngressV1,
  InsightIngressV1,
  WorkIngressV1,
  GapIngressV1,
  LearningEventV1,
  IngressItemV1,
  IngressBatchV1,
  IngressAckV1,
  InstallStatusV1,
} from "./types";
