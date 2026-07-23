# M-PNT Consulting Data Contract V2

> 模块：M-PNT
> 定位：品牌咨询操作系统的数据契约
> 核心判断：M-PNT 不输出答案，而输出可流转、可沉淀、可复用的品牌战略资产

## 一、核心原则冻结

M-PNT 不输出答案。

M-PNT 输出：

**品牌战略资产（Brand Intelligence Assets）**

传统 AI：

```text
问题
  ↓
回答
  ↓
结束
```

MealKey：

```text
问题
  ↓
认知资产
  ↓
决策资产
  ↓
执行资产
  ↓
长期品牌资产
```

所以每一次 M-PNT 使用，都不是一次聊天。

而是：

> 给企业建立一个持续进化的品牌战略数据库。

## 二、Asset Layer 总览

M-PNT V2 定义 8 类核心资产：

```text
FounderProfile
  ↓
BrandBrief
  ↓
MarketInsight
  ↓
PositioningProposal
  ↓
DebateReport
  ↓
FounderDecision
  ↓
PositionContract
  ↓
ImplementationRoadmap
```

对应咨询链路：

| 阶段 | 资产 |
| --- | --- |
| 了解老板 | `FounderProfile` |
| 理解品牌 | `BrandBrief` |
| 判断市场 | `MarketInsight` |
| 专家方案 | `PositioningProposal` |
| 专家会议 | `DebateReport` |
| 创始人选择 | `FounderDecision` |
| 战略冻结 | `PositionContract` |
| 落地执行 | `ImplementationRoadmap` |

## 三、总数据契约原则

### 1. 资产优先于文本

所有阶段产出都必须先写结构化资产，再允许生成解释性文字。

### 2. 资产必须可追溯

每一份资产都需要记录：

- 来自哪个项目
- 来自哪个阶段
- 由哪个 Agent 或模块生成
- 基于哪些输入
- 当前版本号

### 3. 资产必须可复用

M-PNT 的资产不能只给 M-PNT 自己使用。

后续 M-BIZ、M-MKT、M-ED、Launch 都应读取同一份核心品牌资产。

### 4. 资产必须可演进

资产不是一次性生成后就不动。

每次市场变化、用户修订、战略回退，都应该产生新版本，而不是覆盖旧版本。

### 5. 资产必须可进入认知闭环

所有关键资产都需要能挂到：

- `DecisionTrace`
- `CognitiveTrace`
- `BrandMemory`
- `KnowledgeGraph`

## 四、统一元数据协议

所有核心资产共享同一层基础元数据：

```typescript
interface BrandAssetMeta {
  id: string
  projectId: string
  assetType: BrandAssetType
  version: number
  status: "draft" | "confirmed" | "superseded" | "archived"
  createdBy: string
  createdAt: string
  updatedAt: string
  sourceStage: BrandConsultingState
  upstreamAssetIds?: string[]
  traceId?: string
  decisionId?: string
}
```

```typescript
type BrandAssetType =
  | "FounderProfile"
  | "BrandBrief"
  | "MarketInsight"
  | "PositioningProposal"
  | "DebateReport"
  | "FounderDecision"
  | "PositionContract"
  | "ImplementationRoadmap"
```

说明：

- `version` 用于保留战略演化历史
- `status` 用于区分草稿、确认版、被替代版本
- `upstreamAssetIds` 用于记录该资产依赖了哪些前置资产
- `traceId / decisionId` 用于接入认知内核和决策系统

## 五、FounderProfile（创始人画像）

很多 AI 失败，不是因为不会分析项目。

而是因为不理解人。

品牌定位的本质是：

> 创始人的认知 + 市场机会 + 消费者需求 的交叉。

### 数据结构

```typescript
interface FounderProfile extends BrandAssetMeta {
  background: {
    experience: string
    industryYears: number
    previousProjects: string[]
  }

  motivation: {
    whyStart: string
    personalBelief: string
    ambition: string
  }

  decisionStyle: {
    riskPreference: "aggressive" | "balanced" | "conservative"
    speedPreference: string
  }

  resources: {
    capital: string
    team: string
    supplyChain: string
  }

  blindSpots: {
    assumptions: string[]
    risks: string[]
  }
}
```

### 资产来源

- `S1 BRAND_DISCOVERY`
- `BrandInterviewAgent`

### AI 价值

未来 M-PNT 不只是说：

> 你的品牌应该这样定位。

而会说：

> 根据你过去选择，你更倾向扩张型打法，但你的资源结构不支持快速复制，因此建议采用区域深耕战略。

这才是“越来越懂用户”。

## 六、BrandBrief（品牌战略简报）

这是定位工作的事实底稿。

注意：

这里不判断。

这里只建立事实。

### 数据结构

```typescript
interface BrandBrief extends BrandAssetMeta {
  brand: {
    name: string
    category: string
    city: string
    stage: string
  }

  currentSituation: {
    stores: number
    revenue?: string
    customers: string
  }

  currentPosition: {
    currentMessage: string
    customerPerception: string
  }

  problem: {
    biggestProblem: string
    growthBarrier: string
  }

  goal: {
    threeYearVision: string
  }
}
```

### 资产来源

- `S1 BRAND_DISCOVERY`
- 创始人访谈输入
- 项目创建基础资料

### 资产作用

- 作为 `MarketInsight` 的输入条件
- 作为三位专家提案的共同底稿
- 作为后续复盘的“原始事实快照”

## 七、MarketInsight（市场洞察资产）

该资产来自 M-MKT。

M-PNT 不复制市场分析。

M-PNT 消费市场资产，并把它转成定位决策输入。

### 数据结构

```typescript
interface MarketInsight extends BrandAssetMeta {
  market: {
    city: string
    category: string
  }

  opportunity: {
    score: number
    reasons: string[]
  }

  competition: {
    majorPlayers: string[]
    whitespace: string[]
  }

  consumer: {
    trend: string
    unmetNeed: string
  }

  risk: {
    barriers: string[]
  }
}
```

### 资产来源

- `S2 MARKET_DIAGNOSIS`
- `M-MKT`

### 共享对象

这个资产未来给：

- `M-PNT`
- `M-BIZ`
- `Launch`

共同使用。

## 八、PositioningProposal（专家提案）

这是三理论 Agent 的核心输出。

重点不是各说各话。

重点是三个专家必须输出同一种结构。

这样才能进入战略会议。

### 统一协议

```typescript
interface PositioningProposal extends BrandAssetMeta {
  expert: "Ries" | "Trout" | "YeMaozhong"

  coreJudgement: string

  target: {
    customer: string
  }

  positioning: {
    statement: string
    category: string
  }

  mentalAsset: {
    word: string
  }

  reasoning: string[]

  advantages: string[]

  risks: string
}
```

### 资产来源

- `S3 POSITIONING_PROPOSAL`
- `ExpertBoard`

### 示例语义

Ries：

```text
核心判断：
成为年轻湘菜第一认知入口

占据：
年轻湘菜
```

Trout：

```text
核心判断：
避开传统湘菜竞争

建立差异位置
```

叶茂中：

```text
核心判断：
抓住年轻聚餐情绪需求
```

## 九、DebateReport（专家会议资产）

这是 M-PNT 的差异化核心。

不是三个回答拼一起。

而是让战略冲突真正被看见。

### 数据结构

```typescript
interface DebateReport extends BrandAssetMeta {
  participants: Array<{
    expert: string
    position: string
    challenge: string
  }>

  conflicts: Array<{
    topic: string
    sideA: string
    sideB: string
  }>

  consensus: {
    commonGround: string[]
    finalDirection: string
  }

  unresolvedRisks: string[]
}
```

### 示例语义

冲突：

```text
问题：
品牌应该强调湘菜还是年轻社交？
```

Ries：

> 品类认知重要。

叶茂中：

> 情绪入口重要。

最终：

```text
保留：
湘菜品类资产

增加：
年轻社交场景
```

### 资产来源

- `S4 EXPERT_DEBATE`
- `BoardMeeting`

## 十、FounderDecision（创始人决策）

这个资产必须存在。

否则 AI 替用户做决定。

### 数据结构

```typescript
interface FounderDecision extends BrandAssetMeta {
  selectedProposal: string
  adjustments: string[]
  reason: string
  confidence: number
  commitment: string
}
```

### 交互含义

用户参与不是点一个按钮。

而是：

AI：

> 三位专家已经形成建议，你是否认同以下战略？

用户：

```text
接受
部分调整
重新讨论
```

### 资产来源

- `S5 STRATEGY_CONFIRMATION`
- 创始人确认动作

### 资产价值

- 记录老板真正选择了什么
- 记录老板为什么这样选
- 记录老板的信心与承诺程度

## 十一、PositionContract（定位契约）

这是整个 MealKey 最重要的资产之一。

它不是报告结论。

它更像公司的战略宪法。

### 数据结构

```typescript
interface PositionContract extends BrandAssetMeta {
  brandCore: string
  targetCustomer: string
  category: string
  positioningStatement: string
  differentiation: string
  brandPersonality: string
  communicationPrinciples: string[]
  forbiddenActions: string[]
  createdAt: string
}
```

### 资产来源

- `S6 POSITIONING_FREEZE`
- `ConsensusReport + FounderDecision`

### 跨模块价值

未来：

- `M-BIZ` 检查商业模型是否违背定位
- `M-MKT` 检查市场变化是否影响定位
- `M-ED` 检查合伙人设计是否支持战略
- `Launch` 检查门店、菜单、视觉和传播是否跑偏

## 十二、ImplementationRoadmap（执行路线）

定位不能结束在报告。

它必须继续进入经营动作。

### 数据结构

```typescript
interface ImplementationRoadmap extends BrandAssetMeta {
  phase1: {
    goal: string
    actions: string[]
  }

  phase2: {
    validation: string[]
  }

  phase3: {
    scale: string[]
  }

  metrics: {
    awareness: string
    sales: string
    repeat: string
  }
}
```

### 资产来源

- `S7 IMPLEMENTATION_PLAN`
- `ImplementationAgent`

### 资产价值

- 把定位拆成 90 天执行路径
- 定义每阶段的验证任务
- 明确经营指标如何跟踪

## 十三、资产生命周期

M-PNT 的资产流转链路：

```text
FounderProfile
      ↓
BrandBrief
      ↓
MarketInsight
      ↓
PositioningProposal
      ↓
DebateReport
      ↓
FounderDecision
      ↓
PositionContract
      ↓
ImplementationRoadmap
      ↓
BrandEvolution
```

### 生命周期状态

```typescript
type AssetLifecycleStatus =
  | "draft"
  | "confirmed"
  | "superseded"
  | "archived"
```

### 生命周期规则

- 草稿资产可以被补全
- 确认资产可以被后续阶段引用
- 被替代资产不能删除，只能标记 `superseded`
- 归档资产仍可用于长期学习和案例沉淀

## 十四、资产依赖关系

```typescript
type AssetDependencyGraph = {
  founderProfile?: FounderProfile
  brandBrief: BrandBrief
  marketInsight: MarketInsight
  proposals: PositioningProposal[]
  debateReport: DebateReport
  founderDecision: FounderDecision
  positionContract: PositionContract
  implementationRoadmap: ImplementationRoadmap
}
```

关键依赖：

- `FounderProfile` 决定建议如何贴合创始人风格
- `BrandBrief` 提供事实底稿
- `MarketInsight` 提供市场现实
- `PositioningProposal[]` 进入 `DebateReport`
- `DebateReport + FounderDecision` 生成 `PositionContract`
- `PositionContract` 决定 `ImplementationRoadmap`

## 十五、和 Runtime 的关系

Runtime 不应该主要管理：

> 调用哪个 Agent

Runtime 应该主要管理：

> 资产状态如何变化

旧模型：

```text
Runtime
  ↓
Capability
  ↓
Output
```

新模型：

```text
Runtime
  ↓
Workflow State
  ↓
Asset Mutation
  ↓
Decision Event
  ↓
Knowledge Memory
```

### 运行时最小契约

```typescript
interface AssetMutation<TAsset> {
  mutationId: string
  projectId: string
  state: BrandConsultingState
  assetType: BrandAssetType
  action: "create" | "update" | "confirm" | "supersede"
  payload: TAsset
  actor: string
  occurredAt: string
}
```

## 十六、BrandEvent 事件层

M-PNT V2 需要从“输出文本”升级成“记录资产事件”。

### 事件定义

```typescript
type BrandEvent =
  | "PROJECT_CREATED"
  | "FOUNDER_PROFILE_CAPTURED"
  | "BRAND_BRIEF_READY"
  | "MARKET_INSIGHT_IMPORTED"
  | "PROPOSAL_GENERATED"
  | "DEBATE_COMPLETED"
  | "FOUNDER_DECISION_RECORDED"
  | "POSITIONING_CONFIRMED"
  | "ROADMAP_GENERATED"
  | "MARKET_CHANGED"
  | "STRATEGY_UPDATED"
  | "ROADMAP_COMPLETED"
```

### 事件对象

```typescript
interface BrandAssetEvent {
  id: string
  projectId: string
  eventName: BrandEvent
  stage: BrandConsultingState
  assetType?: BrandAssetType
  assetId?: string
  payload?: Record<string, unknown>
  triggeredBy: string
  occurredAt: string
}
```

### 事件作用

- 驱动状态变化
- 记录资产生成与确认
- 驱动 `BrandMemory`
- 驱动 `KnowledgeGraph` 更新
- 为平台观测层提供品牌咨询事件流

## 十七、认知层挂载点

这份 Data Contract 必须接到认知内核上。

### 每份资产需要能挂到以下对象

```typescript
interface AssetCognitiveBinding {
  assetId: string
  traceId?: string
  decisionTraceId?: string
  evidenceIds?: string[]
  confidenceModelId?: string
  memoryId?: string
}
```

### 作用

- 让专家提案有证据来源
- 让创始人决策有信心记录
- 让定位契约有形成过程
- 让后续学习系统知道哪些战略最终被验证成功

## 十八、跨模块读取原则

### M-PNT

读写全部资产。

### M-MKT

主要写 `MarketInsight`，读取 `BrandBrief` 和 `PositionContract`。

### M-BIZ

主要读取 `FounderProfile`、`PositionContract`、`ImplementationRoadmap`。

### M-ED

主要读取 `FounderProfile`、`PositionContract`，检查组织与合作结构是否匹配战略。

### Launch

主要读取 `PositionContract` 和 `ImplementationRoadmap`，保证执行动作不偏航。

## 十九、完整闭环

最终 M-PNT 的完整闭环不是：

```text
用户提问
  ↓
AI 回答
```

而是：

```text
用户进入咨询项目
  ↓
形成 FounderProfile
  ↓
形成 BrandBrief
  ↓
接入 MarketInsight
  ↓
生成 PositioningProposal
  ↓
形成 DebateReport
  ↓
记录 FounderDecision
  ↓
冻结 PositionContract
  ↓
输出 ImplementationRoadmap
  ↓
进入 BrandEvolution
```

这时用户感知不再是：

> AI 给了我一个答案。

而是：

> 我拥有了一套会持续进化的品牌战略资产。

## 二十、冻结结论

《M-PNT Consulting Data Contract V2》冻结的不是字段而已。

它冻结的是：

- M-PNT 到底产出什么
- 资产怎样逐步形成
- 资产如何被 Runtime 推进
- 资产如何进入认知内核
- 资产如何被其他模块复用

这一步完成后，M-PNT 才真正从：

> Agent 功能集合

升级为：

> 品牌咨询操作系统

下一步进入：

## 《M-PNT Frontend Consulting Experience V2》

重点不是页面设计本身。

而是：

**如何把这套咨询过程变成用户能参与、能理解、能产生认知升级的交互体验。**
