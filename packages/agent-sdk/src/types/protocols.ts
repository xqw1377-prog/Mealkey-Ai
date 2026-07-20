/**
 * MealKey OS Kernel — 7 Frozen Protocols
 *
 * 这是 MealKey 操作系统的 7 大核心协议。
 * 一旦冻结，所有 Agent 只能"插入"，不能破坏母体。
 *
 * 依赖方向：Protocol → Core → Runtime → Agent
 * 核心不应该知道 Agent。
 *
 * Frozen: 2026-07-08
 */

// ═══════════════════════════════════════════════════════════════
// Protocol 1: Context Protocol
//
// 所有 Agent 输入统一上下文。
// Agent 不直接查数据库，通过 Context 获取数据。
// Agent 不允许自己重新问用户，它拿 Context。
// ═══════════════════════════════════════════════════════════════

export interface OwnerContext {
  id: string;
  name: string | null;
  email: string | null;
  experience: string;            // "餐饮3年"
  strengths: string[];           // ["产品", "运营"]
  weaknesses: string[];          // ["品牌战略"]
  overallScore: number;          // 0-100
  riskTolerance: string;         // low | medium | high
  investmentStyle: string;       // conservative | moderate | aggressive
}

export interface ProjectContext {
  id: string;
  name: string;
  stage: string;                 // idea | positioning | location | setup | opening | growth
  category: string | null;       // "湘菜"
  target: string | null;         // "年轻消费者"
  city: string | null;           // "长沙"
  district: string | null;
  budget: number | null;         // 500000
  profile: Record<string, unknown> | null;
  healthScore: number | null;
  confidence: number | null;
}

export interface MemoryContext {
  type: "OWNER" | "PROJECT" | "DECISION" | "LEARNING";
  content: string;               // "用户决定走年轻化路线"
  key: string;
  importance: number;            // 0-1
  source: string;
  updatedAt: Date;
}

export interface DecisionContext {
  id: string;
  problem: string;               // "定位"
  judgement: string;             // "需要重新定义核心用户"
  confidence: number;            // 0-1
  type: string;
  createdAt: Date;
}

export interface KnowledgeContext {
  rules: Array<{ id: string; title: string; content: string }>;
  cases: Array<{ id: string; title: string; outcome: string }>;
  models: Array<{ id: string; name: string; formula: string }>;
}

/**
 * Restaurant Brain 注入切片（Protocol 1 扩展，可选）
 * 完整契约在 @mealkey/restaurant-brain；此处仅 Agent 可读摘要，零业务依赖。
 */
export interface RestaurantBrainContextSlice {
  restaurantId: string;
  profile: {
    name: string;
    category: string;
    stage: string;
    storeCount: number;
    city?: string | null;
  };
  capability: {
    overall: number;
    organization: number;
    finance: number;
    confidence: number;
  };
  recentDecisions: Array<{
    question: string;
    chosen?: string;
    actual?: unknown;
  }>;
  learnings: Array<{
    pattern: string;
    insight: string;
  }>;
  /** prompt 短文 — Agent 应优先读此 */
  priorBlock: string;
}

/**
 * MKContext — 所有 Agent 的统一输入
 */
export interface MKContext {
  owner: OwnerContext;
  project: ProjectContext;
  memories: MemoryContext[];
  decisions: DecisionContext[];
  knowledge: KnowledgeContext;
  /** Restaurant Intelligence Layer — 有 project 时由 Factory 注入 */
  restaurantContext?: RestaurantBrainContextSlice | null;
}

// ═══════════════════════════════════════════════════════════════
// Protocol 2: MKDecision Protocol
//
// 所有智能输出最终必须成为 Decision。
// 对应判断链：观察 → 诊断 → 评估 → 策略 → 行动
// 不是聊天，是经营资产。
// ═══════════════════════════════════════════════════════════════

export interface Evidence {
  source: string;                // "knowledge" | "case" | "model" | "observation"
  content: string;
  relevance: number;             // 0-1
}

export interface MKDecision {
  id: string;
  problem: string;               // 问题是什么
  observation: string;           // 观察到了什么
  diagnosis: string;             // 诊断结果
  judgement: string;             // 判断结论
  strategy: string;              // 策略建议
  action: string;                // 具体行动
  confidence: number;            // 0-1
  evidence: Evidence[];
}

// ═══════════════════════════════════════════════════════════════
// Protocol 3: Memory Protocol
//
// Memory 不是聊天记录。分四类：
// Owner Memory / Project Memory / Decision Memory / Learning Memory
// ═══════════════════════════════════════════════════════════════

export type MemoryLayer =
  | "owner"       // 老板长期特征
  | "project"     // 项目变化
  | "decision"    // 历史判断
  | "learning";   // 系统学习

export interface MemoryInput {
  layer: MemoryLayer;
  key: string;
  value: unknown;
  importance: number;            // 0-1
  source: string;
  projectId?: string;
}

export interface MemoryEngine {
  remember(userId: string, memory: MemoryInput): Promise<void>;
  retrieve(userId: string, query: string, limit?: number): Promise<MemoryContext[]>;
  update(userId: string, key: string, value: unknown): Promise<void>;
  forget(userId: string, key: string): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// Protocol 4: Agent Manifest Protocol
//
// Agent 就像 App，必须自描述。
// 未来 Agent Store 入口。
// ═══════════════════════════════════════════════════════════════

export interface AgentManifest {
  id: string;                    // "launch-agent"
  name: string;                  // "开店战略顾问"
  version: string;
  domain: string;                // "startup"
  description: string;
  requiredContext: string[];     // ["owner", "project", "knowledge"]
  capabilities: string[];        // ["market-analysis", "positioning", "business-model"]
  workflow: string;              // 工作流描述
  outputSchema: string;          // 输出 Schema 描述
  pricing?: {
    model: "free" | "subscription" | "per_use";
    price: number;
    currency: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// Protocol 5: Capability Protocol
//
// 能力不属于 Agent，能力属于系统。
// Agent 只是组合能力。
// ═══════════════════════════════════════════════════════════════

export interface CapabilityDefinition {
  id: string;                    // "market-analysis"
  name: string;
  description: string;
  domain: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  execute(input: unknown, context: MKContext): Promise<MKDecision>;
}

// ═══════════════════════════════════════════════════════════════
// Protocol 6: Mission Protocol
//
// Agent 不互相调用，统一通过 Mission 通信。
// Brand Agent 产生 Mission → Mission Router → Finance Agent
// ═══════════════════════════════════════════════════════════════

export interface Mission {
  id: string;
  sourceAgent: string;           // 发起方 Agent ID
  targetAgent: string;           // 目标 Agent ID
  objective: string;             // "生成品牌定位方案"
  context: MKContext;
  status: "pending" | "running" | "completed" | "failed";
  result?: MKDecision;
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// Protocol 7: Agent Run Protocol
//
// 每一次 Agent 工作都记录。
// 用于：复盘、计费、优化、排错。
// ═══════════════════════════════════════════════════════════════

export interface AgentRun {
  id: string;
  agentId: string;
  missionId: string | null;
  inputContext: Partial<MKContext>;
  output: MKDecision | null;
  decisionId: string | null;
  tokens: number;
  duration: number;              // ms
  status: "running" | "success" | "failed";
  createdAt: Date;
}
