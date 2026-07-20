/**
 * @mealkey/agent-sdk
 *
 * MealKey OS SDK — 7 Frozen Kernel Protocols
 *
 * Protocol 1: Context (MKContext, OwnerContext, ProjectContext, MemoryContext, DecisionContext, KnowledgeContext)
 * Protocol 2: Decision (MKDecision, Evidence)
 * Protocol 3: Memory (MemoryEngine, MemoryInput, MemoryLayer)
 * Protocol 4: Agent Manifest (AgentManifest)
 * Protocol 5: Capability (CapabilityDefinition)
 * Protocol 6: Mission (Mission)
 * Protocol 7: Agent Run (AgentRun)
 */

// ═══════════════════════════════════════════════════════════════
// 7 Frozen Protocols
// ═══════════════════════════════════════════════════════════════

export type {
  // Protocol 1: Context
  OwnerContext,
  ProjectContext,
  MemoryContext,
  DecisionContext,
  KnowledgeContext,
  RestaurantBrainContextSlice,
  MKContext,
  // Protocol 2: Decision
  MKDecision,
  Evidence,
  // Protocol 3: Memory
  MemoryLayer,
  MemoryInput,
  MemoryEngine as MemoryStore,
  // Protocol 4: Agent Manifest
  AgentManifest,
  // Protocol 5: Capability
  CapabilityDefinition,
  // Protocol 6: Mission
  Mission,
  // Protocol 7: Agent Run
  AgentRun,
} from "./types/protocols";

// ═══════════════════════════════════════════════════════════════
// Legacy types (agent-runtime system, backward compatibility)
// ═══════════════════════════════════════════════════════════════

// Agent Definition (legacy workflow-based system)
export type {
  AgentManifest as AgentManifestLegacy,
  AgentPricing as AgentPricingLegacy,
  AgentPermissions,
  AgentDefinition,
  AgentCategory,
  AgentCapabilityDeclaration,
} from "./types/agent";

// Capability (legacy, kept for backward compatibility)
export type {
  Capability,
  CapabilityTool,
  CapabilityContext,
} from "./types/capability";

// Mission (old)
export type {
  MissionType,
  MissionRequest,
  MissionResult,
  MissionStatus,
  MissionRecord,
} from "./types/mission";

// Workflow
export type {
  Workflow,
  WorkflowStep,
  WorkflowStepType,
  WorkflowState,
  WorkflowStatus,
  WorkflowStepResult,
} from "./types/workflow";

// Result
export type {
  AgentResult,
  Decision,
  Report,
  ReportSection,
  ReportTemplate,
  ReportTemplateSection,
  Action,
  UIBlock,
  UIBlockType,
} from "./types/result";

// Context (old)
export type {
  AgentContext,
  UserContext,
  ProjectContext as ProjectContextLegacy,
  Memory,
  Knowledge,
  ChatMessage,
  ExecutionContext,
} from "./types/context";

// Stream
export type {
  StreamChunk,
  TextChunk,
  StepStartChunk,
  StepCompleteChunk,
  ToolStartChunk,
  ToolResultChunk,
  MissionSentChunk,
  MissionResultChunk,
  UIBlockChunk,
  ErrorChunk,
  DoneChunk,
} from "./types/stream";

// Agent Interface
export type {
  MealKeyAgent,
  AgentManifestV2,
  AgentPermission,
} from "./types/agent-interface";

// Tool
export type { AgentTool, ToolResult } from "./types/tool";

// ═══════════════════════════════════════════════════════════════
// Auth types (migrated from @mealkey/shared-types)
// ═══════════════════════════════════════════════════════════════

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// ═══════════════════════════════════════════════════════════════
// Utilities — shared across all packages
// ═══════════════════════════════════════════════════════════════

/**
 * 安全解析 JSON 字符串，解析失败返回 null 或 fallback 值
 */
export function safeParseJson<T = unknown>(value: string | null | undefined, fallback?: T): T | null {
  if (!value) return fallback ?? null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback ?? null;
  }
}

/**
 * 安全解析 JSON 字符串数组
 */
export function safeParseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// Tools
// ═══════════════════════════════════════════════════════════════

export { diagnoseTool } from "./tools/diagnose";
export { reportTool } from "./tools/report";
export { searchTool } from "./tools/search";
