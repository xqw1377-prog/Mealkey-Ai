# M-PNT Brand Consulting Workflow V2 状态机设计

> 模块：M-PNT
> 定位：AI 品牌战略咨询项目状态机
> 核心判断：M-PNT 不再是问答式 Agent，而是可被状态驱动、资产驱动、决策驱动的品牌咨询流程

## 一、核心原则重新冻结

M-PNT 不再是：

```text
用户输入问题
  ↓
AI 分析
  ↓
输出方案
```

这是 ChatGPT 模式。

M-PNT 应该是：

```text
用户进入咨询项目
  ↓
顾问诊断
  ↓
市场研究
  ↓
专家提案
  ↓
战略讨论
  ↓
创始人决策
  ↓
落地陪跑
```

这是咨询公司模式。

因此，M-PNT V2 的核心不再是：

- 多强的单次回答
- 一次性生成多完整的报告
- 单个 Agent 的“聪明程度”

而是：

- 是否把咨询过程变成可执行状态机
- 是否让每个阶段都产出明确战略资产
- 是否让创始人参与关键决策节点
- 是否让后续模块都复用同一份定位契约

## 二、总状态机定义

### BrandConsultingState

```typescript
enum BrandConsultingState {
  PROJECT_CREATED,
  BRAND_DISCOVERY,
  MARKET_DIAGNOSIS,
  POSITIONING_PROPOSAL,
  EXPERT_DEBATE,
  STRATEGY_CONFIRMATION,
  POSITIONING_FREEZE,
  IMPLEMENTATION_PLAN,
  BRAND_EVOLUTION,
}
```

完整阶段链路：

```text
S0 PROJECT_CREATED
  ↓
S1 BRAND_DISCOVERY
  ↓
S2 MARKET_DIAGNOSIS
  ↓
S3 POSITIONING_PROPOSAL
  ↓
S4 EXPERT_DEBATE
  ↓
S5 STRATEGY_CONFIRMATION
  ↓
S6 POSITIONING_FREEZE
  ↓
S7 IMPLEMENTATION_PLAN
  ↓
S8 BRAND_EVOLUTION
```

## 三、状态机总规则

### 1. 页面只是状态投影

页面不是工作流本身。

真正推动 M-PNT 的，是 `BrandConsultingState` 和每一阶段的资产完成度。

### 2. 每个状态必须产出资产

M-PNT 不接受“只产生一段文本，没有结构化结果”的阶段。

每个状态结束时都必须写入明确对象。

### 3. 用户拥有关键决策权

AI 可以分析、提案、辩论、建议。

但最终战略选择必须经过创始人确认。

### 4. 冻结后的定位具有全局约束力

`PositioningContract` 一旦生成，后续 M-BIZ、Launch、增长、扩张建议都必须遵守。

### 5. 状态可回退，但不能无痕跳过

允许因用户异议、信息变化、市场更新而回退。

但每次回退都必须保留：

- 回退原因
- 被推翻的判断
- 新增证据
- 重新讨论结果

这部分进入 `DecisionTrace / CognitiveTrace`。

## 四、状态对象骨架

```typescript
type BrandConsultingProject = {
  id: string
  brandName: string
  category: string
  city: string
  currentStage: BrandConsultingState

  brandProject?: BrandProject
  founderProfile?: FounderProfile
  brandBrief?: BrandBrief
  marketInsight?: MarketInsight
  proposals?: ExpertProposal[]
  consensusReport?: ConsensusReport
  founderDecision?: FounderDecision
  positionContract?: PositionContract
  roadmap?: ImplementationRoadmap

  decisionTraceId?: string
  cognitiveSessionId?: string
  updatedAt: string
}
```

## 五、S0 项目创建

### 状态

`PROJECT_CREATED`

### 用户感知

不是：

> 请输入品牌定位问题

而是：

## 创建品牌战略项目

AI 对用户说：

> 我将作为你的品牌战略顾问团队，帮助你完成一次完整品牌定位。
>
> 整个过程分为 8 个阶段。
>
> 最终会形成：
> 《品牌定位战略报告》
> 《90 天落地计划》

### 最小输入

```typescript
type BrandProjectInput = {
  brandName: string
  category: string
  city: string
  currentStage: string
  storeCount: number
  goal: string
}
```

### 产生资产

```typescript
type BrandProject = {
  brandName: string
  category: string
  city: string
  businessStage: string
  storeCount: number
  goal: string
}
```

### Runtime 动作

- 创建 `BrandProject`
- 初始化 `BrandConsultingProject`
- 写入项目启动事件
- 进入品牌探索阶段

### 退出条件

- 最小项目信息已完整

### 下一状态

`BRAND_DISCOVERY`

## 六、S1 品牌探索阶段

### 状态

`BRAND_DISCOVERY`

### 目标

先理解老板，再理解品牌。

M-PNT 在这一阶段解决的不是市场问题，而是创始人认知问题。

### Agent

`BrandInterviewAgent`

### 访谈结构

#### 1. 创业初心

AI：

> 为什么选择做这个品类？

沉淀：

`FounderMotivation`

#### 2. 用户认知

AI：

> 你认为消费者为什么选择你？

沉淀：

`CurrentCustomerHypothesis`

#### 3. 竞争认知

AI：

> 如果消费者不选择你，最大的可能是谁？

沉淀：

`CompetitiveAwareness`

#### 4. 未来目标

AI：

> 三年后你希望消费者如何描述你的品牌？

沉淀：

`BrandVision`

#### 5. 当前困难

AI：

> 目前最大的经营问题是什么？

沉淀：

`PainPoint`

### 阶段产物

```typescript
type BrandBrief = {
  brandSummary: string
  founderMotivation: string
  currentCustomerHypothesis: string
  competitiveAwareness: string
  brandVision: string
  painPoint: string
  coreChallenge: string
}
```

示例：

```text
品牌：
年轻湘菜品牌

创始人目标：
打造区域年轻聚餐第一品牌

当前问题：
消费者认为和普通湘菜没有区别

核心挑战：
如何建立独特认知
```

### Runtime 动作

- 启动自适应访谈
- 判断信息是否足够进入诊断
- 将访谈结果总结成 `BrandBrief`
- 写入 founder 相关 `DecisionTrace`

### 退出条件

- 五轮访谈已完成
- `BrandBrief` 已生成

### 下一状态

`MARKET_DIAGNOSIS`

## 七、S2 市场诊断阶段

### 状态

`MARKET_DIAGNOSIS`

### 目标

把品牌问题放到真实市场里看。

### 架构原则

M-PNT 不自己做市场分析，而是调用 M-MKT。

```text
M-PNT
  ↓
调用
M-MKT
  ↓
获得 Market Intelligence
```

### 输入

- `BrandProject`
- `BrandBrief`

### 输出目标

不是冗长市场报告。

而是：

## 定位输入报告

例如：

```text
市场发现：
湘菜增长仍存在

但是：
传统湘菜竞争严重

消费者变化：
年轻用户需要：
社交
体验
情绪价值

定位机会：
年轻湘菜消费升级
```

### 阶段产物

```typescript
type MarketInsight = {
  categoryTrend: string
  competitionPattern: string
  consumerShift: string[]
  whitespace: string[]
  positioningOpportunity: string
  riskSignals: string[]
}
```

### Runtime 动作

- 调用 `M-MKT`
- 合并市场与品类信号
- 压缩成定位可用输入
- 写入 `MarketInsight`

### 退出条件

- `MarketInsight` 完成

### 下一状态

`POSITIONING_PROPOSAL`

## 八、S3 定位专家提案阶段

### 状态

`POSITIONING_PROPOSAL`

### 目标

不是让三个 Agent 同时给答案。

而是让三个顾问分别形成战略提案。

### 组织形态

`ExpertBoard`

#### Consultant 1: Al Ries

身份：

心智定位专家

关注：

- 品类第一
- 认知占位
- 差异标签

#### Consultant 2: Trout

身份：

竞争战略专家

关注：

- 竞争地图
- 敌人是谁
- 差异化

#### Consultant 3: 叶茂中

身份：

消费者洞察专家

关注：

- 消费场景
- 情绪需求
- 传播记忆

### 单个专家输出

不是最终答案，而是 `StrategicMemo`：

```typescript
type StrategicMemo = {
  coreJudgement: string
  consumerInsight: string
  positioningSuggestion: string
  supportingReasons: string[]
  potentialRisks: string[]
  objectionsToOthers: string[]
}
```

### 阶段产物

```typescript
type ExpertProposal = {
  consultant: "Ries" | "Trout" | "YeMaozhong"
  memo: StrategicMemo
}
```

```typescript
type ProposalSet = ExpertProposal[]
```

### Runtime 动作

- 基于 `BrandBrief + MarketInsight` 生成三位顾问独立 memo
- 不强行求同
- 明确冲突点，为下一阶段辩论做准备

### 退出条件

- 三位顾问 memo 已齐备

### 下一状态

`EXPERT_DEBATE`

## 九、S4 专家战略会议

### 状态

`EXPERT_DEBATE`

### 目标

让三种理论真正发生战略冲突，而不是并排输出三个答案。

### 机制

`BoardMeeting`

流程：

#### 第一轮：各自陈述

每位顾问陈述自己的核心判断。

#### 第二轮：互相挑战

例如：

Ries：

> 你的场景定位缺少长期心智资产。

Trout：

> 你的第一概念会被竞争者快速复制。

叶茂中：

> 你们忽略消费者情绪驱动力。

#### 第三轮：寻找共同战略

目标不是统一口径，而是形成一份清晰可决策的共识报告。

### 阶段产物

```typescript
type ConsensusReport = {
  agreements: string[]
  conflicts: string[]
  recommendedDirection: string
  abandonedOptions: string[]
  retainedIdeas: string[]
}
```

### Runtime 动作

- 运行专家交锋引擎
- 显式记录冲突与反驳
- 输出共识与未解决分歧
- 形成推荐方向

### 退出条件

- `ConsensusReport` 已生成

### 下一状态

`STRATEGY_CONFIRMATION`

## 十、S5 创始人确认

### 状态

`STRATEGY_CONFIRMATION`

### 目标

把最终战略选择权交还给创始人。

否则 AI 会代替老板做战略。

### 页面定位

## 战略选择会议

AI：

> 专家委员会已经完成第一轮讨论。
>
> 当前有三个方向。
>
> 我们建议：
> A 方案
>
> 但最终需要你的战略选择。

### 用户动作

```typescript
type FounderDecisionAction =
  | "ACCEPT"
  | "ADJUST"
  | "REDISCUSS"
```

### 阶段产物

```typescript
type FounderDecision = {
  action: FounderDecisionAction
  selectedDirection?: string
  adjustmentNotes?: string
  reason: string
}
```

### 分支规则

- `ACCEPT`：接受推荐方向，进入冻结
- `ADJUST`：接受主方向，但带条件修改，进入冻结前修订
- `REDISCUSS`：退回 `EXPERT_DEBATE` 重新讨论

### Runtime 动作

- 展示三方案及推荐排序
- 收集创始人理由
- 写入 `FounderDecision`
- 更新 `DecisionTrace`

### 退出条件

- 创始人明确做出选择

### 下一状态

- 默认：`POSITIONING_FREEZE`
- 特殊回退：`EXPERT_DEBATE`

## 十一、S6 定位冻结

### 状态

`POSITIONING_FREEZE`

### 目标

把战略判断从“临时讨论”变成“组织契约”。

### 产物定位

## Brand Position Contract

```typescript
type PositionContract = {
  positioning: string
  targetAudience: string
  coreCompetition: string
  uniqueValue: string
  brandPersonality: string
  communicationDirection: string
  forbiddenActions: string[]
}
```

内容包括：

```text
品牌定位：
目标用户：
核心竞争：
唯一价值：
品牌人格：
传播方向：
禁止事项：
```

### 约束规则

冻结后：

- M-BIZ 的商业模型不能违背定位
- Launch 的开店与扩张建议不能违背定位
- 后续品牌内容、视觉、菜单、空间策略都应读取该契约

### Runtime 动作

- 根据 `ConsensusReport + FounderDecision` 生成正式契约
- 固化为系统级可复用资产
- 标记为当前品牌战略基线

### 退出条件

- `PositionContract` 已确认

### 下一状态

`IMPLEMENTATION_PLAN`

## 十二、S7 落地路线

### 状态

`IMPLEMENTATION_PLAN`

### 目标

把定位变成 90 天内可执行的经营动作。

### Agent

`ImplementationAgent`

### 阶段产物

```typescript
type ImplementationRoadmap = {
  stageOne: string[]
  stageTwo: string[]
  stageThree: string[]
}
```

结构：

#### 第 1 阶段：认知建立

- 品牌语言
- 菜单结构
- 空间表达

#### 第 2 阶段：市场验证

- 用户反馈
- 传播测试
- 复购验证

#### 第 3 阶段：复制体系

- 标准化
- 扩张模型
- 品牌资产

### Runtime 动作

- 从定位契约拆出执行主题
- 形成 30/60/90 天路线
- 生成验证指标与复盘节点

### 退出条件

- `ImplementationRoadmap` 已生成

### 下一状态

`BRAND_EVOLUTION`

## 十三、S8 品牌进化

### 状态

`BRAND_EVOLUTION`

### 目标

M-PNT 不在报告生成后结束，而进入长期品牌陪跑。

### 长期循环

```text
市场变化
  ↓
消费者变化
  ↓
定位健康检查
  ↓
调整建议
```

### 阶段职责

- 跟踪市场变化
- 跟踪消费者反馈
- 检查定位是否仍然有效
- 判断是微调、迭代还是重新发起咨询项目

### 阶段产物

```typescript
type BrandEvolutionRecord = {
  healthStatus: "healthy" | "warning" | "drifting"
  changeSignals: string[]
  adjustmentRecommendation: string
  nextAction: "monitor" | "tune" | "restart_consulting"
}
```

### Runtime 动作

- 周期性健康检查
- 触发增量学习
- 反哺 `BrandMemory / DecisionTrace / KnowledgeGraph`

### 下一状态

- 保持在 `BRAND_EVOLUTION`
- 或基于重大变化重新启动新的咨询周期

## 十四、状态跃迁图

```text
PROJECT_CREATED
  -> BRAND_DISCOVERY
  -> MARKET_DIAGNOSIS
  -> POSITIONING_PROPOSAL
  -> EXPERT_DEBATE
  -> STRATEGY_CONFIRMATION
      -> POSITIONING_FREEZE
      -> EXPERT_DEBATE   (当创始人要求重新讨论)
  -> IMPLEMENTATION_PLAN
  -> BRAND_EVOLUTION
```

## 十五、阶段资产总表

| 阶段 | 状态 | 核心目标 | 主要产物 |
| --- | --- | --- | --- |
| S0 | `PROJECT_CREATED` | 建立咨询项目 | `BrandProject` |
| S1 | `BRAND_DISCOVERY` | 理解创始人与品牌问题 | `BrandBrief` |
| S2 | `MARKET_DIAGNOSIS` | 建立市场现实输入 | `MarketInsight` |
| S3 | `POSITIONING_PROPOSAL` | 形成三位顾问独立提案 | `ExpertProposal[]` |
| S4 | `EXPERT_DEBATE` | 形成冲突与共识 | `ConsensusReport` |
| S5 | `STRATEGY_CONFIRMATION` | 创始人做出选择 | `FounderDecision` |
| S6 | `POSITIONING_FREEZE` | 冻结品牌定位契约 | `PositionContract` |
| S7 | `IMPLEMENTATION_PLAN` | 形成 90 天落地路线 | `ImplementationRoadmap` |
| S8 | `BRAND_EVOLUTION` | 持续健康检查与进化 | `BrandEvolutionRecord` |

## 十六、对后端编排层的影响

现有能力不是被推翻，而是被重新放到咨询流程中。

映射关系：

| 现有能力 | 在新系统中的位置 |
| --- | --- |
| Capability | 咨询能力单元 |
| Theory Matrix | 专家委员会 |
| Decision Engine | 战略决策引擎 |
| Runtime | 咨询状态机 |
| Knowledge | 专家知识与案例资产 |

真正新增的是：

## Consulting Orchestration Layer

```text
consulting/

├── workflow/
│   state-machine.ts
│
├── interview/
│   founder-interview.ts
│
├── diagnosis/
│   brand-diagnosis.ts
│
├── board/
│   expert-board.ts
│
├── decision/
│   founder-decision.ts
│
└── implementation/
    roadmap.ts
```

## 十七、冻结结论

M-PNT V2 的真正升级，不是再加一个 Agent。

而是把品牌咨询的完整过程，重构为：

- 可被状态驱动
- 可被资产驱动
- 可被创始人参与
- 可被其他模块复用

的品牌战略咨询操作系统。

这份状态机文档冻结的是：

- 咨询流程怎么走
- 每一步产生什么
- 谁负责推进
- 哪些节点必须由创始人决策

下一步进入：

## 《M-PNT Consulting Data Contract V2》

需要继续冻结的核心对象：

- `BrandBrief`
- `MarketInsight`
- `ExpertProposal`
- `DebateReport`
- `FounderDecision`
- `PositionContract`
- `Roadmap`
