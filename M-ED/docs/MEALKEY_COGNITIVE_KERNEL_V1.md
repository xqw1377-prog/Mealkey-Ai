# MealKey Cognitive Kernel V1

> 文档类型：平台核心认知内核定义
> 日期：2026-07-11
> 目标：把 MealKey 从 Agent 产品升级为具备经营认知积累能力的平台

## 1. 核心判断

MealKey 的核心不应该是 `ChiefAgent`。

`ChiefAgent` 只是执行入口。

真正的大脑应该是：

> `Cognitive Kernel`

它负责回答的不是：

- 这次调用了哪个模型
- 这次生成了什么文本

而是：

- 为什么形成这个判断
- 这个判断调用了哪些认知资产
- 每个认知资产贡献了多少
- 系统为什么相信这次判断
- 哪条认知路径在长期上更有效

---

## 2. 架构重定义

### 2.1 旧结构

```text
User
  ↓
ChiefAgent
  ↓
LLM
  ↓
Decision
```

这是 Agent 产品结构。

### 2.2 新结构

```text
                Experience Layer
                      ↓
                Agent Runtime
                      ↓
               Cognitive Kernel
         ┌────────────┼────────────┐
         ↓            ↓            ↓
   Knowledge Graph  Reasoning    Memory Graph
                     Engine
         └────────────┼────────────┘
                      ↓
            Decision Intelligence
                      ↓
                Learning Loop
```

### 2.3 定义

`Cognitive Kernel` 是 MealKey 的认知操作系统内核。

它位于：

- Runtime 之下
- Decision Intelligence 之上
- Learning Loop 之前

它统一编排：

- 上下文加载
- 知识检索
- 规则验证
- LLM 推理
- 多源融合
- 决策构建
- 置信度拆解
- 证据归因

---

## 3. Protocol 8 重命名

Protocol 8 不应该叫 `KnowledgeTrace`。

这个命名太窄。

建议冻结为：

> `Protocol 8: Cognitive Trace`

备选名：

- `Reasoning Trace`

但 V1 推荐统一使用：

> `Cognitive Trace`

因为它记录的不是“用了哪条知识”，而是整条认知路径：

- 读取了什么上下文
- 命中了什么知识
- 触发了什么规则
- 进行了什么推理
- 如何融合
- 为什么最终形成该判断

---

## 4. 核心对象

## 4.1 CognitiveSession

一次完整认知过程。

```prisma
model CognitiveSession {
  id                 String            @id @default(cuid())
  agentRunId         String
  projectId          String?
  decisionId         String?
  contextSnapshotRef String?
  status             CognitiveStatus
  confidenceRef      String?
  startedAt          DateTime
  completedAt        DateTime?
  createdAt          DateTime          @default(now())
  traces             CognitiveTrace[]
  evidences          EvidenceReference[]
}

enum CognitiveStatus {
  STARTED
  RUNNING
  COMPLETED
  FAILED
}
```

## 4.2 CognitiveTrace

认知内核最核心的事实对象。

```prisma
model CognitiveTrace {
  id            String            @id @default(cuid())
  sessionId     String
  type          CognitiveTraceType
  sourceType    CognitiveSourceType
  sourceId      String?
  input         Json?
  output        Json?
  confidence    Float?
  weight        Float?
  sequence      Int
  createdAt     DateTime          @default(now())
}

enum CognitiveTraceType {
  CONTEXT_LOAD
  MEMORY_RECALL
  KNOWLEDGE_RETRIEVE
  RULE_VALIDATE
  PATTERN_MATCH
  CASE_RETRIEVE
  LLM_REASON
  FUSION
  DECISION_BUILD
}

enum CognitiveSourceType {
  CONTEXT
  MEMORY
  KNOWLEDGE_NODE
  KNOWLEDGE_EDGE
  RULE
  PATTERN
  CASE
  LLM
  SYSTEM
  USER
}
```

## 4.3 EvidenceReference

证据不再是字符串数组，而是结构化引用关系。

```prisma
model EvidenceReference {
  id            String             @id @default(cuid())
  sessionId     String
  decisionId    String?
  type          EvidenceType
  sourceType    EvidenceSourceType
  sourceId      String
  contribution  Float
  confidence    Float?
  metadata      Json?
  createdAt     DateTime           @default(now())
}

enum EvidenceType {
  SUPPORT
  CONTRADICT
  CONTEXT
  RULE
  CASE
}

enum EvidenceSourceType {
  KNOWLEDGE_NODE
  KNOWLEDGE_EDGE
  RULE
  PATTERN
  CASE
  MEMORY
  USER_INPUT
  LLM_TRACE
}
```

## 4.4 ConfidenceModel

`confidence` 不能只有一个总分。

```prisma
model ConfidenceModel {
  id                   String   @id @default(cuid())
  sessionId            String   @unique
  overall              Float
  dataConfidence       Float?
  knowledgeConfidence  Float?
  ruleConfidence       Float?
  llmConfidence        Float?
  historicalConfidence Float?
  createdAt            DateTime @default(now())
}
```

---

## 5. 认知过程示例

以一次菜单诊断为例：

```text
CognitiveSession CS001
  ├── CONTEXT_LOAD
  │     读取门店规模 / 城市 / 品类 / 历史经营数据
  │
  ├── KNOWLEDGE_RETRIEVE
  │     命中 KnowledgeNode KN102
  │     "湘菜店低毛利 SKU 治理"
  │     similarity = 0.86
  │
  ├── RULE_VALIDATE
  │     Rule R027
  │     "低毛利 SKU 占比 > 40% 触发结构风险"
  │     result = PASS
  │
  ├── LLM_REASON
  │     生成菜品结构调整建议
  │     confidence = 0.78
  │
  ├── FUSION
  │     综合 confidence = 0.84
  │
  └── DECISION_BUILD
        生成 Decision001
```

这条链路就是 MealKey 的经营认知资产。

---

## 6. Knowledge Base 升级为 Knowledge Graph

`KnowledgeNode` 不能只做静态存储。

MealKey 的目标应升级为：

> `Knowledge Graph`

最低关系层建议冻结为：

```text
Rule
  └─ supports ─→ Pattern
Pattern
  └─ observed_in ─→ Case
Case
  └─ produced ─→ Outcome
Outcome
  └─ reinforces / weakens ─→ Rule | Pattern | KnowledgeNode
```

示例：

```text
湘菜门店
  ↓
低毛利 SKU 过高
  ↓
规则 R027
  ↓
调整菜单结构
  ↓
历史成功案例 C102
  ↓
毛利 +6%
```

这意味着未来知识系统至少要支持：

- `KnowledgeNode`
- `KnowledgeEdge`
- `Rule`
- `Pattern`
- `Case`
- `Outcome`

---

## 7. Confidence Breakdown

旧结构：

```json
{
  "overallConfidence": 0.82
}
```

这个值本身不够解释。

V1 推荐结构：

```json
{
  "overall": 0.84,
  "components": {
    "dataConfidence": 0.91,
    "knowledgeConfidence": 0.82,
    "ruleConfidence": 0.90,
    "llmConfidence": 0.76,
    "historicalConfidence": 0.71
  }
}
```

这层的价值是：

- 运营者知道为什么不是 95 分
- 系统知道薄弱点在哪里
- Learning Engine 知道该补数据、补知识还是补规则

---

## 8. Learning 反哺链路

MealKey 的 Learning Engine 不应该只“存结果”。

它必须反过来训练 `Cognitive Kernel`。

```text
Decision
  ↓
Outcome
  ↓
Evaluation
  ↓
有效认知路径识别
  ↓
强化 / 弱化 Cognitive Trace 权重
  ↓
更新 Knowledge / Rule / Pattern 权重
```

例如：

```text
Rule R027
  参与最近 100 次判断
  成功率 88%
  weight: 0.80 → 0.92
```

相反，如果某条案例支持过多失败判断：

```text
KnowledgeNode KN102
  confidence: 0.84 → 0.67
```

所以 Learning 的目标不是“归档经验”，而是：

> 调整认知路径的未来权重

---

## 9. Agent 模型升级

未来 Agent 不应再被定义为：

```text
Agent
  ├── Prompt
  ├── Tools
  └── Knowledge
```

而应该升级为：

```text
Agent
  + Capability
  + Cognitive Policy
  + Decision Strategy
  + Knowledge Scope
  + Tool Scope
```

这意味着：

- Agent 是认知任务执行器
- Cognitive Kernel 是统一认知内核
- Agent 只定义它可以调用什么、关注什么、以什么策略形成判断

---

## 10. MealKey 护城河

MealKey 的护城河不应该是：

- 模型
- Prompt
- Agent 数量

真正护城河应该是：

> `Cognitive Data Flywheel`

```text
每一次经营判断
  ↓
留下认知路径
  ↓
知道哪些知识有效
  ↓
知道哪些判断失败
  ↓
优化知识 / 规则 / 案例权重
  ↓
下一次判断更准确
```

别人可以复制模型调用。

但很难复制：

- 你的认知路径数据
- 你的知识权重体系
- 你的经营判断成功/失败归因

---

## 11. 落地顺序调整

不建议继续按：

```text
Admin → Billing → Runtime
```

建议改为：

### Phase 0：Cognitive Kernel

先新增：

- `CognitiveSession`
- `CognitiveTrace`
- `EvidenceReference`
- `ConfidenceModel`

### Phase 1：Judgment Engine 改造

把 `ChiefAgent` 从：

```text
LLM → Decision
```

改成：

```text
Context
  ↓
Cognitive Kernel
  ↓
Decision
```

### Phase 2：连接 Runtime

Runtime 不再只显示：

- Agent 是否成功

而是显示：

- 为什么成功
- 用了哪些知识
- 哪个规则贡献最大
- 哪条认知路径更可信

### Phase 3：Learning

让：

```text
Decision Outcome
  ↓
Evaluation
  ↓
Knowledge Graph Weight Update
```

---

## 12. 最终结论

没有 `Cognitive Kernel`，MealKey 最终只会变成：

> 一个调用大模型生成餐饮建议的软件

有了这一层，MealKey 才可能变成：

> 一个持续积累餐饮经营认知、越来越懂经营的 AI 操作系统

下一步不应该直接先做 Admin 或 Billing。

下一步应该是：

> 把 `Cognitive Kernel` 接进平台总模型、事件词典和最小执行链路
