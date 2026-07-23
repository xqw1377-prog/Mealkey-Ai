/**
 * @mealkey/agent-sdk — local shim of Frozen Protocols for M-PNT development.
 * When merging into MealKey monorepo, replace this package with the real SDK.
 */

export type {
  OwnerContext,
  ProjectContext,
  MemoryContext,
  DecisionContext,
  KnowledgeContext,
  MKContext,
  Evidence,
  MKDecision,
  MemoryEngineLike,
  KnowledgeEngineLike,
  AgentPricing,
  AgentPermissions,
  AgentManifestLegacy,
  JsonSchemaLike,
  CapabilityDefinition,
  Mission,
  AgentRunStatus,
  AgentRun,
  WorkflowStepType,
  WorkflowStep,
  Workflow,
  AgentDefinition,
  MPntRuntimeConfig,
} from "./protocols";

export { getStructuredPayload } from "./protocols";
