# 《M-BIZ V2 Data Contract & Agent Protocol Design》

> 模块：M-BIZ
> 子标题：Founder Intelligence Layer 商业认知数据协议设计
> 核心判断：四个咨询中心必须共享同一个创业者认知模型，否则它们只是四个彼此隔离的聊天机器人

## 一、这一步要解决什么

现在 MealKey 四个咨询中心最大的问题不是能力不足。

真正的问题是：

> 每个 Agent 都有自己的世界，没有形成共同的创业者认知模型。

结果就是：

- `M-MKT` 不知道 `M-PNT` 做了什么
- `M-PNT` 不知道 `M-BIZ` 的判断依据
- `M-BIZ` 不知道 `M-ED` 的组织约束
- 所有模块都在重复理解用户，而不是延续理解用户

所以这一层要冻结的不是某一个 Agent 的内部结构。

而是：

## Founder Intelligence Layer

也就是：

> AI 对同一个创业者、同一个企业、同一条决策链的持续理解协议。

---

## 二、Founder Intelligence Layer 的核心对象

未来整个系统都围绕一个统一对象展开：

## Founder Business Reality Model

它不是知识库。

它也不是聊天记录。

它是：

> AI 对创业者商业现实的持续建模结果。

其核心演化链路为：

```text
Founder
  ↓
Business
  ↓
Decision
  ↓
Execution
  ↓
Learning
```

这意味着：

- `Founder` 决定 AI 如何理解“人”
- `Business` 决定 AI 如何理解“企业现实”
- `Decision` 决定 AI 如何理解“取舍”
- `Execution` 决定 AI 如何理解“行动是否发生”
- `Learning` 决定 AI 如何把本次结果变成长期记忆

---

## 三、统一数据模型

Founder Intelligence Layer 冻结为四层：

```text
Identity Layer
  ↓
Business Layer
  ↓
Decision Layer
  ↓
Memory Layer
```

四层分工：

| 层级 | 作用 | 解决的问题 |
| --- | --- | --- |
| `Identity Layer` | 理解创业者是谁 | 为什么不同老板做同一件事结果不同 |
| `Business Layer` | 理解企业当前现实 | 企业现在到底处在什么阶段 |
| `Decision Layer` | 理解用户做了什么取舍 | 为什么是这个选择而不是别的选择 |
| `Memory Layer` | 理解历史如何反哺未来 | AI 如何越来越懂这个创始人 |

---

## 四、总协议原则冻结

### 1. 统一上下文优先于模块上下文

任何单个 Agent 的上下文都不能先于 Founder Intelligence Layer。

也就是说：

- `M-MKT` 读的是 Founder + Business + Memory
- `M-PNT` 读的是 Founder + Business + Decision + Memory
- `M-BIZ` 读的是 Founder + Business + Decision + Memory
- `M-ED` 读的是 Founder + Business + Decision + Memory

### 2. 结构化资产优先于自然语言

所有关键输出必须先写为结构化对象，再允许生成解释性文本。

### 3. 决策优先于结论

MealKey 最重要的不是“分析结果”。

而是：

> 创始人最终做了什么选择，为什么这样选，要如何验证。

### 4. 记忆优先于会话

系统长期保存的不是聊天。

而是：

- 企业事实
- 创始人偏好
- 过去决策
- 执行反馈

### 5. 所有资产必须可跨模块流转

`M-BIZ` 写出的资产不能只给 `M-BIZ` 自己用。

例如：

- `FounderContext` 要给全部模块读
- `FounderDecision(domain="PNT")` 要给 `M-BIZ` 读
- `FounderDecision(domain="BIZ")` 要给 `M-ED` 读
- `DecisionMemory` 要给全部模块读

---

## 五、Identity Layer

Identity Layer 解决的是：

> AI 需要理解老板是谁，而不是只理解他的问题是什么。

### 1. FounderContext

```typescript
interface FounderContext {
  founderId: string
  founderName?: string

  background: {
    industryExperience: string[]
    years: number
    skills: string[]
    previousProjects?: string[]
  }

  goal: FounderGoal

  riskPreference: "aggressive" | "balanced" | "conservative"

  decisionStyle?: {
    speed: "fast" | "balanced" | "deliberate"
    trustBasis?: string[]
  }

  constraints?: {
    capital?: string
    team?: string
    family?: string
    region?: string
  }
}
```

### 2. FounderGoal

```typescript
type FounderGoal = {
  northStar: string
  horizon: "1_year" | "3_year" | "5_year" | "long_term"
  ambitionLevel?: "regional" | "national" | "category_leader" | "lifestyle_business"
}
```

### 3. 示例

```json
{
  "founderId": "founder_001",
  "background": {
    "industryExperience": ["餐饮30年"],
    "years": 30,
    "skills": ["门店运营", "供应链"]
  },
  "goal": {
    "northStar": "打造全国连锁品牌",
    "horizon": "5_year",
    "ambitionLevel": "national"
  },
  "riskPreference": "balanced"
}
```

### 4. 为什么重要

因为同一个商业模型：

- 激进老板会优先要规模
- 稳健老板会优先要现金流
- 有品牌野心的老板会优先要心智资产

如果 AI 不理解“人”，就无法理解为什么用户会接受或拒绝某个方案。

---

## 六、Business Layer

Business Layer 解决的是：

> 企业当前处在什么现实状态。

这是 `M-BIZ` 的核心资产层，也是整个 Founder Intelligence Layer 的现实底盘。

### 1. BusinessContext

```typescript
interface BusinessContext {
  businessId: string
  projectId: string

  industry: string
  category: string
  location: string

  stage: BusinessStage

  model: BusinessModel
  customer: CustomerModel
  revenue: RevenueModel
  operation: OperationModel
}
```

### 2. BusinessStage

```typescript
type BusinessStage =
  | "idea"
  | "validation"
  | "traction"
  | "expansion"
  | "restructure"
```

### 3. BusinessModel

```typescript
interface BusinessModel {
  offer: string
  valueProposition: string
  channel?: string[]
  coreCapability?: string[]
  growthMode?: string
}
```

### 4. CustomerModel

```typescript
interface CustomerModel {
  group: string
  scenario?: string
  frequency?: string
  willingnessToPay?: string
}
```

### 5. RevenueModel

```typescript
interface RevenueModel {
  source: string
  pricing?: string
  margin?: string
  recurring?: boolean
}
```

### 6. OperationModel

```typescript
interface OperationModel {
  teamSize?: string
  deliveryMode?: string
  sopLevel?: "low" | "medium" | "high"
  replicationRisk?: string
}
```

### 7. 示例

```json
{
  "industry": "餐饮",
  "category": "社区快餐",
  "location": "深圳",
  "stage": "validation",
  "customer": {
    "group": "家庭用户",
    "frequency": "高频"
  },
  "revenue": {
    "source": "堂食+外卖",
    "margin": "未知"
  }
}
```

### 8. Business Layer 的角色

它不是一组字段而已。

它是四个咨询中心共享的“企业现实底稿”：

- `M-MKT` 在这里补市场机会与竞争约束
- `M-PNT` 在这里读取品牌与用户的价值关系
- `M-BIZ` 在这里写商业结构判断
- `M-ED` 在这里读取组织是否能支撑当前阶段

---

## 七、BusinessFact：ECC 的正式升级

现在的 `FactNode` 还不够。

因为商业判断必须明确区分：

- 事实
- 假设
- 观点

所以 ECC 升级后的最小事实单元应该是：

## `BusinessFact`

```typescript
type BusinessFactType = "FACT" | "ASSUMPTION" | "HYPOTHESIS"
type BusinessFactSource = "user" | "system" | "external"

interface BusinessFact {
  id: string
  businessId: string
  missionId?: string

  type: BusinessFactType
  content: string

  source: BusinessFactSource
  sourceRef?: string

  confidence: number

  dimension?: string
  tags?: string[]

  createdAt: string
}
```

### 示例

事实：

```text
目前有 1 家店
```

```json
{
  "type": "FACT",
  "content": "目前有1家店",
  "source": "user",
  "confidence": 1
}
```

假设：

```text
年轻用户更喜欢健康餐
```

```json
{
  "type": "HYPOTHESIS",
  "content": "年轻用户更喜欢健康餐",
  "source": "user",
  "confidence": 0.6
}
```

### 为什么重要

这样 AI 才不会：

- 把用户猜测当现实
- 把模糊印象当证据
- 把还没验证的判断直接沉淀为 Memory

---

## 八、Decision Layer

Decision Layer 是整个 Founder Intelligence Layer 最重要的层。

因为 MealKey 最终要管理的不是分析报告。

而是：

> 创始人在不同阶段做出的关键选择。

这里需要一个统一的：

## FounderDecision Object

它同时服务于：

- `M-MKT`
- `M-PNT`
- `M-BIZ`
- `M-ED`

### 1. FounderDecision

```typescript
interface FounderDecision {
  decisionId: string
  projectId: string
  founderId: string

  domain: "MKT" | "PNT" | "BIZ" | "ED"

  problem: Problem
  choice: Choice
  reasoning: Reasoning
  tradeoff: Tradeoff
  validation: ValidationPlan

  status: "proposed" | "accepted" | "executing" | "verified"

  upstreamContext?: {
    founderContextId?: string
    businessContextId?: string
    relatedDecisionIds?: string[]
  }

  createdAt: string
  updatedAt: string
}
```

### 2. Problem

```typescript
interface Problem {
  statement: string
  category: string
  urgency?: "low" | "medium" | "high"
}
```

### 3. Choice

```typescript
interface Choice {
  selected: string
  alternatives?: string[]
}
```

### 4. Reasoning

```typescript
interface Reasoning {
  summary: string
  evidence: string[]
  assumptions?: string[]
}
```

### 5. Tradeoff

```typescript
interface Tradeoff {
  gains: string[]
  losses: string[]
  constraints?: string[]
}
```

### 6. ValidationPlan

```typescript
interface ValidationPlan {
  action: string
  milestone?: string[]
  deadline?: string
  successSignal?: string[]
}
```

### 7. 示例

```json
{
  "domain": "BIZ",
  "problem": {
    "statement": "扩张风险",
    "category": "growth"
  },
  "choice": {
    "selected": "暂缓加盟",
    "alternatives": ["开放加盟", "立即融资扩张"]
  },
  "reasoning": {
    "summary": "现阶段不应放大未验证模型",
    "evidence": ["单店模型未验证", "组织能力不足"]
  },
  "tradeoff": {
    "gains": ["降低失控风险", "先稳住盈利能力"],
    "losses": ["规模速度变慢"]
  },
  "validation": {
    "action": "完成3家直营测试",
    "deadline": "90天"
  },
  "status": "accepted"
}
```

### 8. 为什么必须统一

如果没有统一的 `FounderDecision`：

- `M-PNT` 无法把定位选择交给 `M-BIZ`
- `M-BIZ` 无法把商业路线交给 `M-ED`
- `M-ED` 无法知道组织设计到底在服务哪一个战略

---

## 九、Memory Layer

Memory Layer 保存的不是聊天历史。

保存的是：

> 企业成长过程中真正值得被长期记住的结构化认知。

Memory Layer 分三类。

### 1. BusinessMemory

作用：

- 记录企业已经发生的关键事实变化
- 让后续判断基于最新现实，而不是重新盘问

```typescript
interface BusinessMemory {
  id: string
  projectId: string
  type: "business"

  event: string
  summary: string
  effectiveAt: string

  relatedFactIds?: string[]
  relatedDecisionId?: string
}
```

示例：

```text
2026-07 完成第二家店验证
```

### 2. FounderMemory

作用：

- 记录创始人的稳定偏好和决策风格

```typescript
interface FounderMemory {
  id: string
  founderId: string
  type: "founder"

  preference: string
  confidence: number
  evidence?: string[]

  updatedAt: string
}
```

示例：

```text
倾向稳健增长
不喜欢高杠杆扩张
```

### 3. DecisionMemory

作用：

- 记录历史选择及其结果
- 给未来判断提供经验反哺

```typescript
interface DecisionMemory {
  id: string
  projectId: string
  type: "decision"

  decisionId: string
  domain: "MKT" | "PNT" | "BIZ" | "ED"
  summary: string
  outcome?: string

  learned?: string[]
  recordedAt: string
}
```

示例：

```text
曾选择直营路线
结果：利润提升
```

### 4. 统一 Memory 类型

```typescript
type MemoryRecord = BusinessMemory | FounderMemory | DecisionMemory
```

---

## 十、Agent Contract

四个 Agent 必须统一协议。

否则每个模块都会重新定义输入和输出。

### 1. 统一输入协议：AgentContext

```typescript
interface AgentContext {
  founder: FounderContext
  business: BusinessContext
  memory: MemoryRecord[]
  mission: MissionContext
}
```

### 2. MissionContext

```typescript
interface MissionContext {
  missionId: string
  domain: "MKT" | "PNT" | "BIZ" | "ED"
  stage: string
  objective: string
  currentQuestion?: string
}
```

### 3. 统一输出协议：MKDecisionEnvelope

MealKey 所有 Agent 的最终输出都应该统一成：

```typescript
interface MKDecisionEnvelope {
  decision: FounderDecision
  validation: ValidationPlan
  memoryUpdates: MemoryRecord[]
}
```

这意味着：

所有 Agent 输出都遵循同一条链：

```text
Decision
  ↓
Validation
  ↓
Memory Update
```

### 4. Agent 不应该直接输出什么

不应该直接输出：

- 一段长报告
- 一组评分结果
- 一个无法进入 Memory 的建议文本

这些都只是解释层。

真正进入系统的是：

- `FounderDecision`
- `ValidationPlan`
- `MemoryRecord[]`

---

## 十一、四个 Agent 的统一数据流

完整数据流冻结如下：

```text
            Founder
               |
               v
             M-MKT
       市场事实 / 机会判断
               |
               v
             M-PNT
       品牌定位 / 价值选择
               |
               v
             M-BIZ
       商业模型 / 盈利路径
               |
               v
             M-ED
       组织能力 / 合作机制
               |
               v
        Founder Intelligence Memory
```

这一条链不是“模块依赖树”。

它是创业者成长路径的数据流。

也就是说：

- `M-MKT` 产出市场约束和机会判断
- `M-PNT` 在这些约束下做定位与价值选择
- `M-BIZ` 在定位基础上判断商业模式是否成立
- `M-ED` 在商业路径基础上判断组织与合作机制

最终都回流到同一套 Founder Intelligence Memory。

---

## 十二、M-BIZ 内部数据流

M-BIZ 内部的正式链路冻结为：

```text
User Input
  ↓
Fact Collector
  ↓
BusinessContext
  ↓
Diagnosis
  ↓
Council Debate
  ↓
Scenario
  ↓
Decision
  ↓
Validation
  ↓
Memory
```

它与 Runtime V2 的关系是：

- `Fact Collector` 负责生产 `BusinessFact`
- `BusinessContext` 负责建立现实底稿
- `Diagnosis` 负责识别第一性问题
- `Council Debate` 负责形成顾问冲突
- `Scenario` 负责推演不同商业路径
- `Decision` 负责形成 `FounderDecision`
- `Validation` 负责把选择变成验证动作
- `Memory` 负责沉淀长期经验

---

## 十三、和现有 BMJM 的映射

当前 BMJM 逻辑更像：

```text
JudgeRequest
  ↓
InferenceEngine
  ↓
JudgeResponse
```

这个结构能完成分析，但不能形成跨模块认知协议。

V2 需要升级为：

```text
BusinessMission
  ↓
BusinessRuntime
  ↓
MKDecision
  ↓
MemoryUpdate
```

映射关系如下：

| 当前 | V2 对应 |
| --- | --- |
| `JudgeRequest` | `MissionContext + AgentContext` |
| `FactNode` | `BusinessFact` |
| `JudgeResponse` | `MKDecisionEnvelope` |
| `VerificationTask` | `ValidationPlan / BusinessMemory` |
| `历史会话` | `DecisionMemory / FounderMemory / BusinessMemory` |

---

## 十四、与当前 M-BIZ 工程结构的映射

基于现有代码，当前已有：

- `BizPageOutput`
- `BusinessSnapshot`
- `bizMeta`
- `businessContext`
- `bizChat`
- `bizVerify`

这些不需要被立刻推翻。

但它们需要被重新解释。

### 1. `BizPageOutput`

当前位置：

- 底层分析与投影载体

V2 角色：

- Runtime projection 的原始结果包

### 2. `BusinessSnapshot`

当前位置：

- 商业顾问页的页面级摘要

V2 角色：

- `BusinessContext + BusinessDiagnosis + Action Hint` 的过渡视图

### 3. `bizChat`

当前位置：

- 主要推理入口

V2 角色：

- 接收 `AgentContext`
- 推进 `MissionContext`
- 最终写出 `MKDecisionEnvelope`

### 4. `bizVerify`

当前位置：

- 验证回注接口

V2 角色：

- 将验证结果更新为：
  - `BusinessMemory`
  - `DecisionMemory`
  - `FounderMemory`

---

## 十五、Agent Protocol 的标准事件

为了让四个 Agent 真正协作，需要统一事件层。

### 1. AgentInputEvent

```typescript
type AgentInputEvent =
  | "MISSION_STARTED"
  | "CONTEXT_UPDATED"
  | "MEMORY_ATTACHED"
  | "DECISION_REQUIRED"
```

### 2. AgentOutputEvent

```typescript
type AgentOutputEvent =
  | "DECISION_PROPOSED"
  | "DECISION_ACCEPTED"
  | "VALIDATION_CREATED"
  | "MEMORY_UPDATED"
  | "MISSION_COMPLETED"
```

### 3. 为什么要有事件层

因为只有这样：

- 平台才能观测四个咨询中心如何推进同一个项目
- 认知内核才能挂接 `DecisionTrace / CognitiveTrace`
- 前端工作台才能同步阶段状态

---

## 十六、数据治理规则

### 1. BusinessFact 不能直接进入长期 Memory

只有被验证、被反复引用、或推动过关键决策的事实，才应进入 Memory。

### 2. FounderDecision 必须保留版本

创始人可能会：

- 接受
- 调整
- 推翻重做

所以决策对象不能覆盖旧版本。

### 3. FounderMemory 必须来源可追溯

不能因为一次聊天就断言：

> 这个老板一定保守。

Founder 偏好必须有：

- 证据
- 置信度
- 更新时间

### 4. Memory 必须允许被修正

创始人是会成长的。

所以 Memory 不是静态标签，而是可演进理解。

---

## 十七、V2 最大价值变化

现在的 AI 说：

> 你的商业模式评分 75 分。

未来的 Founder Intelligence Layer 会说：

> 我已经理解你的企业。
>
> 我知道你过去为什么选择这个方向。
>
> 我知道你现在最大的风险是什么。
>
> 我知道这个选择会带来什么代价。
>
> 我会陪你做下一步商业决策，并把结果写进长期记忆。

这就是从：

**商业分析工具**

升级到：

**创业者商业操作系统**

---

## 十八、最终结论

`M-BIZ V2 Data Contract & Agent Protocol Design` 的核心，不是在 M-BIZ 内部再加一个协议。

而是定义：

> 四个咨询中心共享同一个 Founder Intelligence Layer。

这个 Layer 的核心组成已经冻结为：

- `FounderContext`
- `BusinessContext`
- `BusinessFact`
- `FounderDecision`
- `MemoryRecord`
- `AgentContext`
- `MKDecisionEnvelope`

这意味着从现在开始：

- 四个 Agent 共享同一个创业者现实模型
- 四个 Agent 共享同一个决策对象
- 四个 Agent 共享同一套长期 Memory
- 前台工作台与后台 Runtime 将开始真正对齐

---

## 十九、下一步

下一步进入：

# 《M-BIZ V2 Agent Workflow 详细设计》

重点把五个阶段：

1. `Discovery`
2. `Diagnosis`
3. `Council`
4. `Simulation`
5. `Decision`

拆成：

- Agent 职责
- Prompt 策略
- Tool 调用
- 输入输出 Schema
- Memory 写入规则
- 前端状态同步

这一步完成后，M-BIZ 才真正具备独立开发 V2 的完整蓝图。
