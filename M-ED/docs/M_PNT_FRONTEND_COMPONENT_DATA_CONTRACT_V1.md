# M-PNT Frontend Component + Data Contract V1

> 模块：M-PNT
> 产品名：品牌定位中心
> 英文名：Brand Positioning Studio
> 文档角色：前端施工规格稿

## 一、核心设计原则

先冻结一个原则：

## M-PNT 前端不是页面集合

而是：

> 一个品牌战略任务生命周期工作台。

所以不要设计：

```text
/chat
/report
/expert
/result
```

这种工具型结构。

应该设计：

```text
Brand Positioning Workspace

        ↓

Journey State Machine

        ↓

每个阶段一个工作状态
```

## 二、整体页面架构

### 主路由

```text
projects/[projectId]/positioning
```

它不是某一个页面。

而是整个品牌咨询工作台的主入口。

### 内部阶段状态

```typescript
type PositioningStage =
  | "foundation"
  | "interview"
  | "market"
  | "expert"
  | "debate"
  | "contract"
  | "roadmap"
```

对应关系：

| Stage | 用户看到 |
| --- | --- |
| `foundation` | 品牌战略首页 |
| `interview` | 创始人访谈 |
| `market` | 市场洞察 |
| `expert` | 专家工作室 |
| `debate` | 战略会议 |
| `contract` | 定位契约 |
| `roadmap` | 执行路径 |

### 页面顶层结构

```tsx
<PositioningWorkspace>
  <WorkspaceHeader />
  <JourneyTimeline />
  <StageRenderer />
  <ChiefAdvisorPanel />
</PositioningWorkspace>
```

说明：

- `PositioningWorkspace` 是整个咨询容器
- `WorkspaceHeader` 提供项目级状态
- `JourneyTimeline` 提供咨询旅程感
- `StageRenderer` 渲染当前阶段页面
- `ChiefAdvisorPanel` 只做引导、解释、准备度判断

## 三、顶层组件体系

### 1. PositioningWorkspace

职责：

- 拉取工作台总数据
- 持有当前 `stage`
- 管理阶段切换
- 分发当前资产到子组件

建议签名：

```typescript
type PositioningWorkspaceProps = {
  projectId: string
  initialData: PositioningWorkspaceOutput
}
```

### 2. WorkspaceHeader

职责：

展示：

- 品牌名称
- 项目阶段
- 战略完成度
- AI 当前提示

结构：

```tsx
<WorkspaceHeader>
  <BrandName />
  <CurrentStage />
  <PositioningScore />
  <AIStatus />
</WorkspaceHeader>
```

数据：

```typescript
type PositioningHeader = {
  brandName: string
  stage: string
  completion: number
  aiMessage: string
}
```

### 3. JourneyTimeline

职责：

- 呈现咨询旅程
- 显示已完成 / 当前 / 未开始阶段
- 允许回看

建议数据：

```typescript
type JourneyStep = {
  key: PositioningStage
  label: string
  status: "completed" | "current" | "upcoming"
  assetLabel?: string
}
```

### 4. StageRenderer

职责：

- 根据 `PositioningStage` 渲染对应页面
- 保持每个阶段的单一任务感

建议签名：

```typescript
type StageRendererProps = {
  stage: PositioningStage
  data: PositioningWorkspaceOutput
}
```

### 5. ChiefAdvisorPanel

职责：

- 告诉用户下一步
- 解释为什么
- 判断是否进入下一阶段

建议数据：

```typescript
type ChiefAdvisorState = {
  summary: string
  ready: boolean
  known: string[]
  missing: string[]
  recommendation: string
}
```

## 四、阶段组件设计

## Stage 1

## BrandFoundation

首页。

组件树：

```text
BrandFoundationPage
 ├─ BrandHero
 ├─ StrategyHealthCard
 ├─ BrandMap
 └─ NextActionCard
```

数据：

```typescript
type BrandFoundation = {
  brand: string
  category: string
  city: string

  health: {
    score: number
    strengths: string[]
    risks: string[]
  }

  nextAction: string
}
```

用户看到的不是：

> 开始聊天

而是：

```text
AI 已经理解你的品牌

下一步：

进入战略访谈
```

## Stage 2

## FounderInterview

组件树：

```text
FounderInterviewPage
 ├─ QuestionCard
 ├─ AnswerInput
 ├─ AIInsightCard
 └─ ProgressIndicator
```

核心数据：

```typescript
type InterviewState = {
  question: string
  answer?: string
  insight?: {
    discovery: string
    impact: string
  }
}
```

关键机制：

每回答一次，产生一个 `Insight`。

例如输入：

> 我想做年轻人喜欢的湘菜。

输出：

```json
{
  "discovery": "品牌目标不是卖菜，而是改变湘菜消费场景",
  "impact": "定位方向偏向年轻社交场景"
}
```

这就是：

**AI 理解增长**

### 前端交互要求

- 输入后先显示理解反馈，再切下一题
- `AIInsightCard` 必须比普通提示更强
- `ProgressIndicator` 只显示当前轮次和总体进度，不做问卷条

## Stage 3

## MarketInsight

组件树：

```text
MarketInsightPage
 ├─ OpportunityScore
 ├─ MarketMap
 ├─ CompetitorLandscape
 ├─ GapCard
 └─ AIConclusion
```

数据：

```typescript
type MarketInsightView = {
  opportunity: number
  competition: number
  gap: number
  timing: number
  whiteSpaces: Array<{
    title: string
    reason: string
  }>
  conclusion: string
}
```

重点：

不要输出报告。

输出判断。

### 前端交互要求

- `MarketMap` 是视觉中心
- `CompetitorLandscape` 只保留最关键竞争层
- `AIConclusion` 必须能一句话说清判断

## Stage 4

## ExpertCouncil

这是核心页面。

组件树：

```text
ExpertCouncilPage
 ├─ ExpertTable
 ├─ RiesCard
 ├─ TroutCard
 ├─ YeCard
 ├─ ConflictPanel
 └─ StartDebateButton
```

专家数据：

```typescript
type TheoryExpert = {
  name: string
  theory: string
  position: string
  arguments: string[]
  recommendation: string
}
```

例如：

```json
{
  "name": "Ries",
  "theory": "心智定位",
  "recommendation": "年轻湘菜第一品牌"
}
```

### 前端交互要求

- 三位专家要有角色感，不是三张结果卡
- `ConflictPanel` 要持续显示当前主要争议
- `StartDebateButton` 是从提案进入会议的仪式性动作

## Stage 5

## StrategyDebate

这是 AI 最大价值体现。

组件树：

```text
DebateRoom
 ├─ DebateTimeline
 ├─ ExpertVoice
 ├─ ConflictDetector
 └─ ConsensusCard
```

数据：

```typescript
type DebateSession = {
  messages: Array<{
    speaker: string
    position: string
    challenge: string
  }>

  conflicts: Array<{
    topic: string
    sideA: string
    sideB: string
  }>

  consensus: string
}
```

用户感觉不是：

> AI 给答案

而是：

> AI 帮我完成战略推演

### 前端交互要求

- `DebateTimeline` 逐条推进，不一次性展示全部结果
- `ConflictDetector` 负责把冲突翻译成人能理解的取舍
- `ConsensusCard` 只在辩论后段抬升出来

## Stage 6

## PositionContract

最终资产。

组件树：

```text
PositionContractPage
 ├─ ContractHeader
 ├─ PositionStatement
 ├─ UserDefinition
 ├─ Difference
 ├─ ForbiddenZone
 └─ FreezeButton
```

数据：

```typescript
type PositionContractView = {
  statement: string
  targetCustomer: string
  value: string
  difference: string
  forbidden: string[]
  version: string
}
```

冻结时产生：

```json
{
  "type": "POSITIONING_FROZEN"
}
```

并进入：

`MealKey Decision Archive`

### 前端交互要求

- `FreezeButton` 必须有签署感
- 冻结后显示版本号
- 冻结后应切换成“已生效战略资产”视觉状态

## Stage 7

## Roadmap

组件树：

```text
PositioningRoadmap
 ├─ PhaseTimeline
 ├─ ActionCard
 ├─ KPI
 └─ NextAgentRouter
```

数据：

```typescript
type RoadmapView = {
  phases: Array<{
    period: string
    goal: string
    actions: string[]
    metrics: string[]
  }>

  nextAgent: "M-BIZ"
}
```

### 前端交互要求

- 路线图要强调阶段推进
- `KPI` 要跟每阶段动作绑定
- `NextAgentRouter` 负责告诉用户后续进入哪个咨询中心

## 五、统一数据契约

前端不要理解后端内部实现。

只消费：

```typescript
PositioningWorkspaceOutput
```

完整定义：

```typescript
interface PositioningWorkspaceOutput {
  projectId: string
  stage: PositioningStage
  header: PositioningHeader
  advisor: ChiefAdvisorState

  foundation?: BrandFoundation
  interview?: InterviewState
  market?: MarketInsightView
  experts?: {
    experts: TheoryExpert[]
  }
  debate?: DebateSession
  contract?: PositionContractView
  roadmap?: RoadmapView
}
```

### Mapper 原则

后端资产层与前端视图层不要直接耦合。

需要一个显式 mapper：

```typescript
mapPositioningWorkspaceOutput(input: {
  brandBrief?: BrandBrief
  marketInsight?: MarketInsight
  proposals?: PositioningProposal[]
  debateReport?: DebateReport
  positionContract?: PositionContract
  roadmap?: ImplementationRoadmap
}): PositioningWorkspaceOutput
```

作用：

- 把后端结构化资产转成前端工作台数据
- 屏蔽后端演化对前端组件的影响

## 六、Runtime 状态机

这是最重要部分。

M-PNT 不应该：

> 请求一次 -> 返回结果

应该：

> 持续推进

### Runtime 状态

```text
CREATED
  ↓
UNDERSTANDING
  ↓
MARKET_ANALYSIS
  ↓
EXPERT_ANALYSIS
  ↓
DEBATING
  ↓
POSITION_CONFIRMED
  ↓
EXECUTION
```

### Runtime 事件

```typescript
type PositioningRuntimeEvent =
  | "USER_COMPLETE_INTERVIEW"
  | "AI_FINISH_ANALYSIS"
  | "EXPERT_READY"
  | "DEBATE_COMPLETE"
  | "USER_CONFIRM"
```

### 前端状态机建议

```typescript
type WorkspaceRuntimeState = {
  runtimeState:
    | "CREATED"
    | "UNDERSTANDING"
    | "MARKET_ANALYSIS"
    | "EXPERT_ANALYSIS"
    | "DEBATING"
    | "POSITION_CONFIRMED"
    | "EXECUTION"
  pendingEvent?: PositioningRuntimeEvent
}
```

说明：

- 页面 `stage` 负责用户看到哪里
- `runtimeState` 负责系统实际推进到哪里
- 两者相关，但不是一个概念

## 七、Agent Runtime 接口

前端不直接调专家、辩论、决策等碎片接口。

前端只和 Workspace Runtime 对话。

### 1. 获取工作台

```http
GET /api/projects/:projectId/positioning/workspace
```

返回：

```typescript
PositioningWorkspaceOutput
```

### 2. 提交访谈回答

```http
POST /api/projects/:projectId/positioning/interview
```

请求：

```typescript
type SubmitInterviewAnswerInput = {
  answer: string
}
```

响应：

```typescript
type SubmitInterviewAnswerOutput = {
  stage: "interview"
  interview: InterviewState
  advisor: ChiefAdvisorState
}
```

### 3. 启动专家提案

```http
POST /api/projects/:projectId/positioning/experts/start
```

响应：

```typescript
type StartExpertsOutput = {
  stage: "expert"
  experts: {
    experts: TheoryExpert[]
  }
}
```

### 4. 启动战略会议

```http
POST /api/projects/:projectId/positioning/debate/start
```

响应：

```typescript
type StartDebateOutput = {
  stage: "debate"
  debate: DebateSession
}
```

### 5. 冻结定位契约

```http
POST /api/projects/:projectId/positioning/contract/freeze
```

请求：

```typescript
type FreezeContractInput = {
  confirmed: true
}
```

响应：

```typescript
type FreezeContractOutput = {
  stage: "contract"
  contract: PositionContractView
  decision: {
    type: "POSITIONING_FROZEN"
  }
}
```

### 6. 获取执行路径

```http
GET /api/projects/:projectId/positioning/roadmap
```

响应：

```typescript
type RoadmapOutput = {
  stage: "roadmap"
  roadmap: RoadmapView
}
```

## 八、AI Chief Advisor 的位置

不要让 `Chief Advisor` 直接回答全部问题。

它负责三件事。

### 1. 引导

告诉用户下一步。

### 2. 解释

解释为什么。

### 3. 判断准备度

例如：

```text
我已经了解：

你的行业背景
你的资源优势
你的目标客户


但还缺：

竞争认知


建议继续市场分析。
```

### Advisor 契约

```typescript
type AdvisorRecommendation = {
  known: string[]
  missing: string[]
  explanation: string
  nextStep: PositioningStage
}
```

## 九、前端最终文件结构

建议：

```text
components/
  operating/
    positioning/
      PositioningWorkspace.tsx
      WorkspaceHeader.tsx
      JourneyTimeline.tsx
      BrandFoundation.tsx
      FounderInterview.tsx
      MarketInsight.tsx
      ExpertCouncil.tsx
      StrategyDebate.tsx
      PositionContract.tsx
      PositioningRoadmap.tsx
      ChiefAdvisor.tsx

lib/
  positioning/
    types.ts
    state-machine.ts
    mapper.ts
```

### 推荐职责拆分

- `types.ts`：前端视图类型与接口协议
- `state-machine.ts`：页面阶段和 runtime 状态管理
- `mapper.ts`：后端资产 -> 前端工作台输出映射

## 十、这一版最大的变化

之前：

```text
M-PNT = 六个能力模块
```

用户感觉：

> AI 工具

现在：

```text
M-PNT = 一次完整品牌战略咨询过程
```

用户感觉：

> 我正在和一个品牌咨询团队工作

## 十一、与既有文档关系

这份文档承接：

- `M_PNT_FRONTEND_CONSULTING_EXPERIENCE_V2.md`
- `M_PNT_HIGH_FIDELITY_INTERACTION_PROTOTYPE_V2.md`
- `M_PNT_CONSULTING_DATA_CONTRACT_V2.md`

作用是把：

- 咨询体验
- 高保真交互
- 资产层定义

翻译成前端真正能施工的：

- React 页面结构
- Component Tree
- 状态流转
- API 契约

## 十二、下一步

下一步应该进入：

## 《M-PNT Runtime V2 产品流程改造方案》

重点解决：

1. 当前后端 `Capability` 如何映射到新流程
2. 三专家如何真正参与，而不是三个文本生成器
3. `Decision Engine` 如何成为战略会议主持人
4. 用户参与节点如何插入 Runtime
5. 如何让 AI 越用越懂这个老板

这一层才是把 M-PNT 从：

> AI 工具

变成：

> AI 咨询机构

的关键。
