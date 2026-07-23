# 《Founder OS 数据闭环设计 V1》

> 子标题：从“一次咨询”到“长期商业伙伴”
>
> 核心判断：Founder OS 的真正护城河，不是知识库，不是 Prompt，不是单次分析能力，而是企业成长过程中持续积累、持续修正、持续反馈的决策数据闭环。

## 一、这一步要解决什么

前面我们已经解决了：

> AI 怎么像一个咨询团队。

我们已经冻结了：

- `Chief Advisor`
- `Domain Expert`
- `Knowledge Specialist`
- `Mission Planner / Expert Router / Debate Engine / Decision Synthesizer`

也已经在工程上逐步建立了：

- `Founder Intelligence Layer`
- `Decision / Memory / Event`
- `protocolProjection`

但 Founder OS 如果要从一次咨询走向长期陪伴，还缺最关键的一层：

> 为什么系统会越来越懂这个老板、越来越懂这家公司。

这一步要解决的，不是“模型继续变强”。

这一步要解决的是：

## Founder OS 如何形成自己的长期认知资产

---

## 二、先重新定义 AI 的核心资产

很多 AI 产品默认认为：

> 资产 = 知识库。

这是不够的。

因为知识：

- 是公开的
- 是可复制的
- 是大模型已经具备的

Founder OS 真正有价值的资产不是知识文本。

而是：

## 企业成长过程中的决策数据

也就是：

```text
企业发生了什么
  ↓
AI 怎么理解
  ↓
老板选择了什么
  ↓
结果怎么样
  ↓
AI 下次如何判断
```

这条链形成的不是普通数据表。

它形成的是：

# Business Memory Graph

也就是：

> Founder OS 对一家公司长期成长轨迹的结构化商业记忆图谱。

---

## 三、Founder OS 六层数据模型冻结

Founder OS 数据闭环冻结为六层：

```text
              Founder OS Memory

                  企业认知层
                      ↑

                    决策层
                      ↑

                    事件层
                      ↑

                    执行层
                      ↑

                    结果层
                      ↑

                    学习层
```

这六层不是六个孤立模块。

它们共同构成一条闭环：

```text
Profile / Graph
  ↓
Event
  ↓
Decision
  ↓
Execution
  ↓
Outcome
  ↓
Learning
  ↓
Update Profile / Graph / Decision Weights
```

也就是说：

- 上层不是静态资料
- 下层不是一次性结果
- 整个系统通过事件、决策、执行、结果和学习不断回写自身认知

---

## 四、第一层：Founder Profile

这一层不是个人资料。

不是：

```json
{
  "姓名": "",
  "行业": "",
  "职位": ""
}
```

这种资料没有真正决策价值。

Founder OS 需要的是：

## Founder Cognitive Profile

也就是：

> 这个 Founder 如何做决策。

---

## 1. Founder Cognitive Profile Schema

```typescript
interface FounderProfile {
  founderId: string
  background: Experience
  decisionStyle: DecisionStyle
  riskPreference: RiskPreference
  businessBeliefs: Belief[]
  strengths: Capability[]
  blindSpots: BlindSpot[]
  updatedAt: string
}
```

进一步展开：

```typescript
interface Experience {
  industries: string[]
  years: number
  roles?: string[]
  wins?: string[]
  failures?: string[]
}

interface DecisionStyle {
  horizon: "short_term" | "balanced" | "long_term"
  pace: "fast" | "balanced" | "deliberate"
  trustBasis?: string[]
}

type RiskPreference = "low_leverage" | "balanced" | "aggressive"

interface Belief {
  statement: string
  confidence: number
  source?: string
}

interface Capability {
  name: string
  confidence: number
}

interface BlindSpot {
  name: string
  confidence: number
  evidence?: string[]
}
```

---

## 2. 示例

```json
{
  "decisionStyle": {
    "horizon": "long_term",
    "pace": "deliberate"
  },
  "riskPreference": "low_leverage",
  "strengths": [
    { "name": "运营管理", "confidence": 0.87 }
  ],
  "blindSpots": [
    { "name": "品牌传播", "confidence": 0.72 }
  ]
}
```

---

## 3. 为什么重要

因为同一个建议，给两个老板，结果会不同。

例如：

- 一个 Founder 会优先保现金流
- 一个 Founder 会优先抢机会
- 一个 Founder 能强执行但弱品牌
- 一个 Founder 懂产品但不懂组织

如果没有 Founder Cognitive Profile，系统的建议永远只有“通用正确性”，没有“这个人会不会真的执行”的现实判断。

---

## 五、第二层：Business Model Graph

这是 `BusinessContext` 的升级版。

当前我们已经有：

- `BusinessContext`
- `Founder Intelligence Layer`

下一步需要从“对象字段”升级到“企业关系图谱”。

也就是：

## Business Graph

---

## 1. 图谱结构

```text
企业
 ├── 品牌
 ├── 产品
 ├── 用户
 ├── 渠道
 ├── 收入
 ├── 成本
 ├── 组织
 ├── 竞争
 └── 战略目标
```

---

## 2. Schema

```typescript
interface BusinessGraph {
  businessId: string
  projectId: string
  nodes: BusinessNode[]
  edges: BusinessEdge[]
  updatedAt: string
}

interface BusinessNode {
  id: string
  type:
    | "brand"
    | "product"
    | "customer"
    | "channel"
    | "revenue"
    | "cost"
    | "organization"
    | "competition"
    | "goal"
  label: string
  summary?: string
  metadata?: Record<string, unknown>
}

interface BusinessEdge {
  from: string
  to: string
  relation:
    | "serves"
    | "depends_on"
    | "competes_with"
    | "drives"
    | "constrains"
    | "supports"
}
```

---

## 3. 示例

```text
湘宴

品牌：高端湘菜
用户：商务宴请
收入：堂食
成本：人工 + 食材
渠道：线下门店
目标：100 店
```

这不是文字摘要而已。

它应该成为四个部门共享的“企业数字底图”：

- `M-MKT` 读取市场与竞争关系
- `M-PNT` 读取品牌与用户关系
- `M-BIZ` 读取收入、成本、组织与增长关系
- `M-ED` 读取组织、股权、激励和目标关系

---

## 六、第三层：Event Memory

企业不是静态对象，而是连续变化系统。

所以 Founder OS 必须有：

## 企业事件流

---

## 1. Event Schema

```typescript
interface BusinessEvent {
  eventId: string
  projectId: string
  time: string
  type: "growth" | "risk" | "decision" | "change"
  description: string
  impact: Impact
  source?: "user" | "system" | "agent" | "external"
}

interface Impact {
  onRevenue?: string
  onCost?: string
  onGrowth?: string
  onOrganization?: string
  onBrand?: string
  onRisk?: string
}
```

---

## 2. 示例

```text
2026-07-10
第二家店开业
```

AI 不应该只记录：

> 你现在有两家店。

而应该记录：

```text
事件：
第一次复制验证开始发生

影响：
- 复制能力 ↑
- 资金压力 ↑
```

也就是说，Event Memory 保存的是：

- 变化本身
- 变化的意义
- 变化对后续判断的影响

---

## 七、第四层：Decision Memory

这是整个系统最重要的 Memory 层。

因为真正有价值的不是“分析过什么”，而是：

> 做过什么选择，为什么这样选，后来结果怎样。

---

## 1. Decision Memory Schema

```typescript
interface DecisionMemory {
  decisionId: string
  projectId: string
  missionId?: string
  problem: string
  options: DecisionOption[]
  chosen: DecisionOption
  reason: string[]
  confidence: number
  validation: ValidationPlan
  result?: Outcome
  createdAt: string
  updatedAt: string
}

interface DecisionOption {
  id: string
  label: string
  summary?: string
}

interface ValidationPlan {
  action: string
  milestone?: string[]
  deadline?: string
}

interface Outcome {
  status: "success" | "partial_success" | "failed" | "unknown"
  summary: string
  evidence?: string[]
}
```

---

## 2. 示例

问题：

> 是否加盟？

选项：

- A 加盟
- B 直营
- C 联营

最终：

- 选择 `B`

半年后：

```text
直营验证成功
```

Founder OS 下一次判断时，就不能再像第一次那样“从零分析加盟”。

它必须知道：

- 这家公司曾经做过类似取舍
- 当时为什么这样选
- 结果回来如何
- 哪个判断模型应该被修正

这就是：

> 企业专属经验资产。

---

## 八、第五层：Execution Memory

咨询系统最常见的问题是：

- 方案做完
- 会议结束
- 价值中断

Founder OS 必须补上：

## 执行记忆

它不是简单任务提醒。

它是：

> 决策落地过程中的偏离监控与执行认知。

---

## 1. Execution Memory Schema

```typescript
interface ExecutionMemory {
  executionId: string
  projectId: string
  decisionId: string
  checkpoints: ExecutionCheckpoint[]
  deviations: ExecutionDeviation[]
  updatedAt: string
}

interface ExecutionCheckpoint {
  phase: "30d" | "60d" | "90d" | "custom"
  goal: string
  progress: number
  status: "on_track" | "delayed" | "blocked" | "done"
}

interface ExecutionDeviation {
  time: string
  expected: string
  actual: string
  impact: string
}
```

---

## 2. 示例

会议决策：

```text
90 天完成 3 家店模型验证
```

拆成：

```text
30 天：完成标准化手册
60 天：完成培训体系
90 天：验证复制能力
```

Founder OS 后续不是只提醒“该做任务了”。

而是判断：

> 执行是否已经偏离原始决策假设。

例如：

```text
根据计划，第 45 天应该完成培训体系，
但目前完成度只有 60%，这会影响加盟验证时点。
```

这就是：

- 决策跟进
- 经营偏差预警
- 咨询价值延续

---

## 九、第六层：Learning Memory

这是最高层，也是 Founder OS 最像“长期商业伙伴”的部分。

每一次：

- 预测
- 判断
- 结果

最后都要沉淀成：

## 学习

---

## 1. Learning Memory Schema

```typescript
interface LearningMemory {
  learningId: string
  domain: "market" | "brand" | "business" | "organization"
  pattern: string
  signal: string[]
  outcome: string
  confidenceDelta: number
  weightUpdate?: Record<string, number>
  createdAt: string
}
```

---

## 2. 示例

过去 20 次餐饮判断中，Founder OS 发现：

```text
快速加盟失败率：72%
主要原因：组织能力不足
```

那么下一次再遇到：

- 餐饮
- 快速加盟
- 组织成熟度不足

系统就应该：

- 自动提高风险权重
- 更谨慎地给出建议
- 更明确地要求验证复制能力

这就是：

> 商业经验积累。

不是“更会说”。

而是“更会判断”。

---

## 十、完整数据闭环冻结

Founder OS 的完整闭环如下：

```text
用户提出问题
  ↓
Chief Advisor 理解问题
  ↓
调用专家
  ↓
形成判断
  ↓
Founder 做决策
  ↓
执行发生
  ↓
结果回来
  ↓
Memory 更新
  ↓
AI 判断越来越准
```

如果没有最后四步：

- 决策
- 执行
- 结果
- 更新

Founder OS 就只是一次性咨询工具。

只有把它们接起来，系统才会变成：

> 越用越懂的长期商业伙伴。

---

## 十一、和当前四个咨询部门的对接方式

四个部门都不是独立写各自的孤立 Memory。

它们共同写入：

## Business Memory Graph

但每个部门负责不同维度。

### 1. M-MKT

写入：

- 市场 Memory
- 品类趋势
- 用户变化
- 竞争变化

### 2. M-PNT

写入：

- 品牌 Memory
- 定位选择
- 用户认知
- 品牌资产

### 3. M-BIZ

写入：

- 商业 Memory
- 盈利模型
- 扩张策略
- 关键风险

### 4. M-ED

写入：

- 组织 Memory
- 股权结构
- 人才配置
- 激励机制

最终四者共同形成：

## 企业数字孪生

也就是：

> 一家公司在 Founder OS 中的长期成长镜像。

---

## 十二、后端架构对应

当前每个 Agent 仍然偏独立。

Founder OS 下一阶段需要一个统一核心层：

```text
founder-core/

├── context-engine
├── memory-engine
├── event-engine
├── decision-engine
├── graph-engine
└── learning-engine
```

这意味着：

- 四个 Agent 逐步退为插件 / 部门 Runtime
- Founder Core 成为统一认知内核

组织结构变为：

```text
Founder Core
     |
 -----------------
 |       |       |
M-PNT   M-BIZ   M-MKT
    |
   M-ED
```

---

## 十三、与当前工程状态的映射

基于目前已经完成的工程收口，Founder OS 已经具备闭环设计的三个基础：

### 1. 协议基础

已具备：

- `FounderContext`
- `BusinessContext`
- `FounderDecision`
- `MemoryRecord`

说明：

> 系统已经有了最小闭环对象语言。

### 2. 投影基础

已具备：

- `protocolProjection`
- 四个工作台统一投影层
- `agent.ts` 已开始返回统一 projection

说明：

> 前后端已经开始使用同一套认知输出语言。

### 3. 组织基础

已具备：

- `Chief Advisor`
- `Mission`
- `Debate`
- `Decision`
- `Memory Writer`

说明：

> Founder OS 已经可以从“单 Agent 输出”过渡到“组织化闭环”。

---

## 十四、Business Memory Graph 的最终定义

Founder OS 的真正核心资产冻结为：

## Business Memory Graph

```typescript
interface BusinessMemoryGraph {
  founderProfile: FounderProfile
  businessGraph: BusinessGraph
  events: BusinessEvent[]
  decisions: DecisionMemory[]
  executions: ExecutionMemory[]
  learnings: LearningMemory[]
  updatedAt: string
}
```

它的意义是：

- `FounderProfile` 解释这个人
- `BusinessGraph` 解释这家公司
- `Event` 解释最近发生了什么
- `Decision` 解释做过什么取舍
- `Execution` 解释现在执行到哪里
- `Learning` 解释系统学到了什么

这才是 Founder OS 真正的“长期陪伴大脑”。

---

## 十五、数据治理原则冻结

### 1. 决策必须版本化

Founder 可能会：

- 接受
- 调整
- 推翻重开

所以 `DecisionMemory` 不能覆盖。

### 2. 事件必须带影响解释

记录事件不是记流水账。

必须回答：

> 这个变化会改变什么判断。

### 3. Learning 不能直接覆盖规则

Learning 先改变：

- 风险权重
- 置信度
- 推荐优先级

而不是直接重写底层理论。

### 4. Founder Profile 必须允许修正

认知不是标签。

Founder 会成长，系统理解也必须成长。

---

## 十六、产品终局

用户第一天：

> AI 帮我做一个商业分析。

三个月后：

> AI 知道我的企业历史。

一年后：

> AI 比新来的顾问更懂我的公司。

三年后：

> AI 拥有这个企业完整成长轨迹。

这才是 Founder OS 的壁垒。

不是一次回答更漂亮。

而是：

> 它拥有持续理解这家公司的能力。

---

## 十七、最终结论

Founder OS 的核心资产不是 Knowledge Base。

Founder OS 的核心资产是：

## Business Memory Graph

它由六层组成：

1. `Founder Profile`
2. `Business Model Graph`
3. `Event Memory`
4. `Decision Memory`
5. `Execution Memory`
6. `Learning Memory`

这六层共同决定：

- AI 是否理解这个 Founder
- AI 是否理解这家公司
- AI 是否知道过去做过什么选择
- AI 是否知道执行是否偏离
- AI 是否会因为结果而修正未来判断

这才是 Founder OS 从“一次咨询工具”升级为“长期商业伙伴”的真正闭环。

---

## 十八、下一步

下一步进入：

# 《Founder OS Knowledge Asset V2》

重点解决：

为什么现在 `M-PNT / M-BIZ / M-MKT` 虽然有知识库、有规则、有 Prompt，
但仍然没有真正形成：

## Expert Reasoning Pattern

下一步需要冻结：

- 专家人格模型
- 判断框架
- 思考链模板
- 案例记忆
- 决策模式库
- 行业经验库

这一步会直接决定：

> 为什么 Founder OS 未来会不像“更大的 ChatGPT”，而更像“更成熟的咨询专家系统”。
