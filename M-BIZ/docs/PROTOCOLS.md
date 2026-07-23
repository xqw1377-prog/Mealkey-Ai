# 7 Frozen Protocols

> 定义在 `@mealkey/agent-sdk/src/types/protocols.ts`
> 所有 Agent 和 Capability 必须遵循。依赖方向: Protocol → Core → Runtime → Agent
>
> 扩展约定（不冻结，但所有消费者必须兼容）定义在 `@mealkey/core` 的 ChiefAgent 输出中。

## Protocol 1: Context

所有 Agent 输入的统一上下文。Agent 不直接查数据库，通过 Context 获取数据。

```typescript
interface MKContext {
  owner: OwnerContext;        // 经营者画像
  project: ProjectContext;    // 项目信息
  memories: MemoryContext[];  // 历史记忆
  decisions: DecisionContext[]; // 历史决策
  knowledge: KnowledgeContext;  // 行业知识
}

interface OwnerContext {
  id: string;
  name: string | null;
  email: string | null;
  experience: string;       // "餐饮3年"
  strengths: string[];      // ["产品", "运营"]
  weaknesses: string[];     // ["品牌战略"]
  overallScore: number;     // 0-100
  riskTolerance: string;    // low | medium | high
  investmentStyle: string;  // conservative | moderate | aggressive
}
```

## Protocol 2: MKDecision

所有智能输出必须成为 Decision。对应判断链：观察 → 诊断 → 评估 → 策略 → 行动。

```typescript
interface MKDecision {
  id: string;
  problem: string;       // 问题是什么
  observation: string;   // 观察到了什么
  diagnosis: string;     // 诊断结果
  judgement: string;     // 判断结论
  strategy: string;      // 策略建议
  action: string;        // 具体行动
  confidence: number;    // 0-1
  evidence: Evidence[];
}
```

### Evidence source 格式约定（V2）

`Evidence.source` 字段采用 `{类型}:{ID}` 格式，上层系统可据此解析判断依据的来源：

| source 格式 | 含义 | 示例 |
|------------|------|------|
| `observation` | 从用户输入提取的事实 | `observation` |
| `knowledge_rule:{id}` | 匹配的经营规则 | `knowledge_rule:MK-RULE-0001` |
| `knowledge_case:{id}` | 匹配的案例 | `knowledge_case:MK-CASE-0011` |
| `risk_analysis` | 风险评估结果 | `risk_analysis` |
| `tool` | 工具执行结果 | `tool` |

**向后兼容**: `knowledge_rule` 和 `knowledge_case` 格式（无 ID）仍然可能出现在历史数据中，消费者应兼容两种格式。

### AgentMetadata 扩展（ChiefAgent 输出约定）

`AgentResult.metadata` 包含以下非冻结但已标准化的扩展字段，所有消费者（Dashboard、Report、Billing）可以依赖：

```typescript
interface AgentMetadata {
  // ... frozen fields ...
  
  /** 本次判断引用的知识节点（可追溯） */
  knowledgeRefs?: Array<{
    id: string;           // 知识 ID，如 "MK-RULE-0001"
    type: "rule" | "case" | "model";
    title: string;
    relevance: number;    // 0-1，匹配置信度
  }>;

  /** 规则引擎对 LLM 判断的校验结果 */
  ruleValidation?: Array<{
    ruleId: string;       // 规则 ID
    matched: boolean;     // 是否匹配
    judgement: string;    // 规则判断内容
    risk: string;         // 风险等级
    llmConsistent: boolean; // LLM 判断是否与规则一致
  }>;
}
```

### MKDecision 证据链约定

`MKDecision.evidence[]` 中，当 source 为 `knowledge_rule:{id}` 或 `knowledge_case:{id}` 格式时，`{id}` 对应 knowledge-engine 中的 `DecisionRule.id` 或 `CaseStudy.id`。上层系统可通过此 ID 查询完整的知识内容。

## Protocol 3: Memory

Memory 不是聊天记录。分四类记忆。

```typescript
type MemoryLayer = "owner" | "project" | "decision" | "learning";

interface MemoryEngine {
  remember(userId: string, memory: MemoryInput): Promise<void>;
  retrieve(userId: string, query: string, limit?: number): Promise<MemoryContext[]>;
  update(userId: string, key: string, value: unknown): Promise<void>;
  forget(userId: string, key: string): Promise<void>;
}
```

### 记忆中的知识引用记录

当 `LearningEngine` 沉淀学习记忆时，layer 为 `"learning"`、key 前缀为 `knowledge_refs_` 的记忆记录包含知识引用信息：

```typescript
// 存入 Memory 的 value 格式
{
  decisionId: string;         // 关联的决策 ID
  problem: string;            // 决策问题
  judgement: string;          // 判断结论
  score: number;              // 结果评分 0-1
  refs: Array<{
    id: string;               // 知识 ID
    type: "rule" | "case" | "model";
    title: string;
  }>;
}
```

## Protocol 4: Agent Manifest

Agent 就像 App，必须自描述。未来 Agent Store 入口。

```typescript
interface AgentManifest {
  id: string;                    // "launch-agent"
  name: string;                  // "开店战略顾问"
  version: string;
  domain: string;                // "startup"
  description: string;
  requiredContext: string[];     // ["owner", "project", "knowledge"]
  capabilities: string[];        // ["market-analysis", "positioning"]
  workflow: string;              // 工作流描述
  outputSchema: string;          // 输出 Schema 描述
  pricing?: { model: string; price: number; currency: string };
}
```

## Protocol 5: Capability

能力不属于 Agent，能力属于系统。Agent 只是组合能力。

```typescript
interface CapabilityDefinition {
  id: string;                    // "market-analysis"
  name: string;
  description: string;
  domain: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  execute(input: unknown, context: MKContext): Promise<MKDecision>;
}
```

## Protocol 6: Mission

Agent 不互相调用，统一通过 Mission 通信。

```typescript
interface Mission {
  id: string;
  sourceAgent: string;    // 发起方 Agent ID
  targetAgent: string;    // 目标 Agent ID
  objective: string;      // "生成品牌定位方案"
  context: MKContext;
  status: "pending" | "running" | "completed" | "failed";
  result?: MKDecision;
  createdAt: Date;
}
```

## Protocol 7: Agent Run

每一次 Agent 工作都记录。用于：复盘、计费、优化、排错。

```typescript
interface AgentRun {
  id: string;
  agentId: string;
  missionId: string | null;
  inputContext: Partial<MKContext>;
  output: MKDecision | null;
  decisionId: string | null;
  tokens: number;
  duration: number;       // ms
  status: "running" | "success" | "failed";
  createdAt: Date;
}
```
