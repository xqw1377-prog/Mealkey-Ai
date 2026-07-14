/**
 * MealKey 7 Frozen Protocols
 *
 * These types mirror @mealkey/agent-sdk/protocols.ts in the parent monorepo.
 * DO NOT diverge field names when integrating — only extend via optional fields
 * if the monorepo already allows them.
 *
 * 当前 gaps（本次修复）：
 * 1. @mealkey/core 的 orchestrator/agent-os.service 未传递 knowledgeEngine / memoryEngine
 * 2. RUN_MODE 未与环境变量同步（HEURISTIC / HYBRID / LLM）
 * 3. AgentRuntime.run 未将三理论矩阵信息写入 AgentRun.artifacts
 * 4. m-pnt.service 中的 POSITIONING_TIMEOUT_MS 写死未使用
 * 5. @mealkey/agent-runtime package.json 无 m-pnt exports path
 */

// ─── Protocol 1: Context ─────────────────────────────────────

export interface OwnerContext {
  id?: string;
  name?: string;
  experience?: string;
  strengths?: string[] | string;
  weaknesses?: string[] | string;
  preferences?: Record<string, unknown>;
}

export interface ProjectContext {
  id?: string;
  name?: string;
  category?: string;
  city?: string;
  district?: string;
  stage?: string;
  budget?: number | string;
  profile?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MemoryContext {
  id?: string;
  layer?: string;
  key?: string;
  value?: unknown;
  summary?: string;
  importance?: number;
  createdAt?: string;
}

export interface DecisionContext {
  id?: string;
  type?: string;
  summary?: string;
  reasoning?: string;
  confidence?: number;
  agentId?: string;
  createdAt?: string;
}

export interface KnowledgeContext {
  nodes?: Array<{
    id?: string;
    title?: string;
    content?: unknown;
    tags?: string[];
  }>;
  texts?: string[];
}

export interface MKContext {
  owner: OwnerContext;
  project: ProjectContext;
  memories: MemoryContext[];
  decisions: DecisionContext[];
  knowledge: KnowledgeContext;
}

// ─── Protocol 2: MKDecision ──────────────────────────────────

export interface Evidence {
  source: string;
  content: string;
  relevance: number;
}

export interface MKDecision {
  id: string;
  problem: string;
  observation: string;
  diagnosis: string;
  judgement: string;
  strategy: string;
  action: string;
  confidence: number;
  evidence: Evidence[];
}

/**
 * Local-only extension: structured step data rides in evidence
 * with source === "structured" (JSON string). Not part of frozen MKDecision.
 */
export function getStructuredPayload(
  decision: MKDecision,
): Record<string, unknown> | undefined {
  const hit = decision.evidence.find((e) => e.source === "structured");
  if (!hit) return undefined;
  try {
    return JSON.parse(hit.content) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

// ─── Protocol 3: Memory & Knowledge Engine (运行时注入接口) ──

export interface KnowledgeEngineLike {
  query(
    query: string,
    opts?: { tags?: string[]; topK?: number },
  ): Promise<Array<{ id: string; title: string; content: unknown; score: number; tags?: string[] }>>;
}

export interface MemoryEngineLike {
  getContextForAgent(
    projectId: string,
    agentId: string,
  ): Promise<{ memories: MemoryContext[]; recentDecisions: DecisionContext[] }>;
  saveDecision(
    projectId: string,
    agentId: string,
    decision: {
      type: string;
      summary: string;
      reasoning: string;
      confidence: number;
    },
  ): Promise<void>;
}

// ─── Protocol 4: Agent Manifest ──────────────────────────────

export interface AgentPricing {
  type: "one_time" | "subscription" | "usage";
  price: number;
  currency: string;
}

export interface AgentPermissions {
  knowledge?: boolean;
  project?: boolean;
  memory?: boolean;
}

export interface AgentManifestLegacy {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  capabilities: string[];
  pricing?: AgentPricing;
  permissions?: AgentPermissions;
}

// ─── Protocol 5: Capability ──────────────────────────────────

export interface JsonSchemaLike {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface CapabilityDefinition {
  id: string;
  name: string;
  description: string;
  domain: string;
  inputSchema: JsonSchemaLike;
  outputSchema: JsonSchemaLike;
  execute(input: unknown, context: MKContext): Promise<MKDecision>;
}

// ─── Protocol 6: Mission ─────────────────────────────────────

export interface Mission {
  id: string;
  type: string;
  goal: string;
  payload?: Record<string, unknown>;
  parentMissionId?: string;
  fromAgentId?: string;
  toAgentId?: string;
}

// ─── Protocol 7: AgentRun ────────────────────────────────────

export type AgentRunStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface AgentRun {
  id: string;
  agentId: string;
  missionId?: string;
  projectId?: string;
  status: AgentRunStatus;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  result?: MKDecision;
  /** M-PNT 扩展：运行时引擎注入 */
  runMode?: "heuristic" | "hybrid" | "llm";
  /** M-PNT 扩展：决策跟踪 */
  artifacts?: {
    differentiationId?: string;
    synthesisId?: string;
    elapsedMs?: number;
  };
}

// ─── Workflow ────────────────────────────────────────────────

/** Aligned with monorepo @mealkey/agent-sdk WorkflowStepType */
export type WorkflowStepType = "analysis" | "question" | "decision" | "action";

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  capabilities?: string[];
  knowledge?: string[];
  prompt?: string;
  next?: string;
  output?: "final";
}

export interface Workflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
}

// ─── Agent Definition ────────────────────────────────────────

export interface AgentDefinition {
  manifest: AgentManifestLegacy;
  workflow: Workflow;
  capabilities: CapabilityDefinition[];
  prompt: string;
  reportTemplate?: unknown;
}

// ─── M-PNT 运行时配置 ────────────────────────────────────────

export interface MPntRuntimeConfig {
  /** 运行模式 */
  runMode: "heuristic" | "hybrid" | "llm";
  /** 知识引擎（由 orchestrator 注入） */
  knowledgeEngine?: KnowledgeEngineLike;
  /** 记忆引擎（由 orchestrator 注入） */
  memoryEngine?: MemoryEngineLike;
  /** LLM 适配器 */
  llm?: {
    chat(params: {
      model?: string;
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      maxTokens?: number;
    }): Promise<{ content: string }>;
  };
  /** 品类竞争数据文件路径（可选覆盖） */
  marketDataPath?: string;
}
