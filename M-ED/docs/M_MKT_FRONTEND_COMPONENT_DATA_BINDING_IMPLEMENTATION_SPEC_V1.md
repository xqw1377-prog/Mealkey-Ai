# M-MKT Frontend Component & Data Binding Implementation Spec V1

> 模块：M-MKT
> 产品名：市场机会中心
> 英文名：Market Opportunity Center
> 文档角色：工程落地规格稿

## 一、Frontend Architecture

这一份开始从产品设计进入工程落地。

目标是把前面设计的：

> 市场咨询体验

转换成：

> MealKey Runtime 可以驱动的前端工作台。

核心原则继续冻结：

**前端不理解 Agent 内部逻辑，只消费市场判断结果。**

### 页面入口

路径：

```text
apps/web/src/app/(dashboard)/projects/[projectId]/market/page.tsx
```

页面容器：

```tsx
<MarketOpportunityWorkspace />
```

### 页面职责

只负责：

1. 获取项目上下文
2. 获取 M-MKT 状态
3. 渲染工作台
4. 处理用户动作

不负责：

- 市场计算
- 专家逻辑
- 评分
- 推理

## 二、页面组件结构

最终目录：

```text
components/
└── operating/
    └── market/
        MarketWorkspace.tsx
        MarketHeader.tsx
        MarketJourneyTimeline.tsx
        MarketInterview.tsx
        MarketScanPanel.tsx
        MarketInsightCard.tsx
        MarketOpportunityHero.tsx
        MarketFoundationCard.tsx
        MarketCompetitionCard.tsx
        MarketCouncilRoom.tsx
        MarketExpertCard.tsx
        MarketDebatePanel.tsx
        MarketConsensusCard.tsx
        MarketDecisionCard.tsx
        MarketNextAction.tsx
        MarketHistory.tsx
        MarketFeedback.tsx
```

### 推荐分层

```text
app/(dashboard)/projects/[projectId]/market/page.tsx
  ↓
MarketWorkspace
  ↓
Header / Timeline / Stage Renderer / Decision / Next Action
```

## 三、页面主组件

## MarketWorkspace.tsx

核心结构：

```tsx
export function MarketWorkspace() {
  const { data, status } = trpc.agent.marketContext.useQuery()

  return (
    <>
      <MarketHeader />
      <MarketJourneyTimeline />

      {status === "INTERVIEW" && <MarketInterview />}
      {status === "SCANNING" && <MarketScanPanel />}
      {status === "COUNCIL" && <MarketCouncilRoom />}
      {status === "DECISION" && <MarketDecisionCard />}
    </>
  )
}
```

关键原则：

页面由状态驱动。

不是页面写死流程。

### 推荐签名

```ts
type MarketWorkspaceProps = {
  projectId: string
  initialData?: MarketPageOutput
}
```

## 四、核心数据模型

前端统一消费：

```text
MarketPageOutput
```

完整定义：

```ts
export interface MarketPageOutput {
  project: {
    id: string
    name: string
  }

  market: {
    city: string
    district?: string
    category: string
  }

  stage: "INTERVIEW" | "SCANNING" | "COUNCIL" | "DEBATE" | "DECISION"

  overview: {
    score: number
    level: "HIGH" | "MEDIUM" | "LOW"
    judgement: string
  }

  foundation: {
    consumerTrend: string
    categoryStage: string
    marketSize: string
    summary: string
  }

  competition: {
    density: number
    players: string[]
    weakness: string[]
    whitespace: string[]
  }

  insights: Array<{
    id: string
    title: string
    finding: string
    evidence: string
    confidence: number
  }>

  council: Array<{
    role: string
    name: string
    focus: string
    opinion: string
    risk: string
  }>

  debate: {
    conflicts: string[]
    consensus: string
  }

  decision: {
    result: string
    reasons: string[]
    risks: string[]
    entryStrategy: string
    nextAgent: "M-PNT" | "M-BIZ" | "MEETING"
  }
}
```

### 视图层补充对象

为了支撑工作台组件，建议补一层前端视图对象：

```ts
export type MarketWorkspaceViewModel = {
  header: MarketHeaderModel
  timeline: MarketTimelineStep[]
  page: MarketPageOutput
}

export type MarketHeaderModel = {
  projectName: string
  stageLabel: string
  aiMessage: string
  marketLabel: string
}

export type MarketTimelineStep = {
  key: "INTERVIEW" | "SCANNING" | "INSIGHT" | "COUNCIL" | "DECISION"
  label: string
  status: "completed" | "current" | "upcoming"
}
```

## 五、状态管理设计

不要使用复杂 Redux。

M-MKT V1 推荐：

```text
Server State:
tRPC


UI State:
useState


Runtime State:
Agent Stream
```

### Server State

来源：

```ts
trpc.agent.marketContext
```

### UI State

例如：

```ts
const [activeExpert, setActiveExpert] = useState<string | null>(null)
const [activeSignal, setActiveSignal] = useState<string | null>(null)
const [decisionDraft, setDecisionDraft] = useState<string>("")
```

### Runtime State

流式：

```ts
useAgentStream()
```

## 六、Stream 事件设计

这是体验关键。

用户不能看到：

> 等待 30 秒

需要看到：

> AI 正在工作

定义：

```ts
type MarketStreamEvent =
  | { type: "market.started" }
  | {
      type: "market.analysis.progress"
      stage: "city" | "category" | "competition" | "case"
      message: string
    }
  | {
      type: "market.insight.created"
      data: {
        title: string
        finding: string
      }
    }
  | {
      type: "market.expert.opinion"
      role: "strategist" | "operator" | "investor"
      message?: string
    }
  | { type: "market.decision.ready" }
```

### Event 1

开始：

```json
{
  "type": "market.started"
}
```

UI：

显示：

```text
市场分析启动
```

### Event 2

分析节点：

```json
{
  "type": "market.analysis.progress",
  "stage": "competition",
  "message": "正在分析长沙湘菜竞争结构"
}
```

UI：

时间线更新。

### Event 3

发现：

```json
{
  "type": "market.insight.created",
  "data": {
    "title": "",
    "finding": ""
  }
}
```

UI：

动态增加 `Insight Card`。

### Event 4

专家发言：

```json
{
  "type": "market.expert.opinion",
  "role": "operator"
}
```

UI：

专家卡出现。

### Event 5

决策：

```json
{
  "type": "market.decision.ready"
}
```

UI：

切换到决策区，激活 CTA。

## 七、组件详细定义

## 1. MarketOpportunityHero

最重要。

Props：

```ts
interface MarketOpportunityHeroProps {
  score: number
  judgement: string
  risk: string
}
```

展示：

```text
市场机会

82

存在结构性机会


最大风险：

竞争密度高
```

## 2. MarketInsightCard

Props：

```ts
type MarketInsightCardProps = {
  title: string
  finding: string
  confidence: number
}
```

设计要求：

不要显示大量数据。

显示判断。

## 3. MarketCouncilRoom

Props：

```ts
type MarketCouncilRoomProps = {
  experts: ExpertOpinion[]
}
```

内部使用：

```text
MarketExpertCard
```

专家模型：

```ts
type ExpertOpinion = {
  role: "战略专家" | "经营专家" | "投资专家"
  view: string
  concern: string
}
```

## 4. MarketDebatePanel

这是区别 GPT 的地方。

Props：

```ts
type MarketDebatePanelProps = {
  conflicts: string[]
  consensus: string
}
```

展示逻辑：

```text
观点冲突

↓

AI 归纳

↓

形成共识
```

## 5. MarketDecisionCard

最终输出。

Props：

```ts
type MarketDecisionCardProps = {
  result: string
  strategy: string
  nextAgent: string
}
```

CTA：

```text
进入品牌定位
```

调用：

```ts
router.push("/projects/id/positioning")
```

## 八、tRPC 接口设计

和 M-PNT / M-ED 对齐。

新增：

```text
agent.marketMeta
agent.marketContext
agent.marketStart
agent.marketHistory
agent.marketReports
agent.marketFeedback
```

### marketMeta

返回：

```ts
{
  name: "Market Opportunity Center",
  version: "1.0",
  steps: 6
}
```

### marketContext

核心返回：

```ts
{
  stage,
  pageOutput
}
```

### marketStart

用户点击开始。

输入：

```ts
{
  projectId
}
```

返回：

```text
sessionId
```

### marketFeedback

用户反馈：

```ts
{
  decisionId,
  accepted,
  comment
}
```

## 九、和 Runtime 对接

调用：

```text
forceAgent="m-mkt"
```

链路：

```text
page.tsx

↓

marketStart

↓

Agent Runtime

↓

m-mkt workflow

↓

Decision

↓

pageOutput

↓

UI
```

## 十、用户参与点设计

这是必须强化的。

M-MKT 不能全自动。

每个阶段必须有用户动作。

### 阶段 1

输入：

创业背景。

### 阶段 2

确认 AI 发现。

例如：

```text
AI 发现：

年轻消费者正在增长


是否符合你的观察？


[符合]
[不符合]
[补充]
```

### 阶段 3

专家会议：

用户可以：

```text
提出疑问
```

### 阶段 4

决策：

用户确认：

```text
接受建议

调整方向

重新分析
```

## 十一、V1 开发拆分

## Sprint 1

纯前端：

完成：

- 页面骨架
- 6 屏状态
- Mock Data

## Sprint 2

接：

- tRPC
- `pageOutput`

## Sprint 3

接：

- Stream
- 动态过程

## Sprint 4

接：

- Decision
- Report
- Memory

## 十二、最终收口

M-MKT 前端 V1 的验收标准不是：

> 页面显示出来

而是：

用户完成一次完整体验：

```text
我提出创业想法

↓

AI 理解我的项目

↓

AI 分析市场

↓

AI 展示发现

↓

三个专家讨论

↓

告诉我是否值得进入

↓

告诉我下一步做什么
```

用户最终感知应是：

> 它不像一个 AI 工具，更像一个陪我做市场决策的战略团队。

## 十三、与既有文档关系

本文件承接：

- `M_MKT_FRONTEND_IMPLEMENTATION_V1.md`
- `M_MKT_FRONTEND_PROTOTYPE_V1.md`

这份规格稿负责把：

- 页面原型
- 咨询体验
- 工作台结构

翻译成：

- React 组件结构
- Props 定义
- 状态管理
- tRPC 接口绑定
- stream 事件映射
- `pageOutput` 渲染规则

## 十四、下一步

下一步建议进入：

# 《M-MKT Frontend UI Design System V1》

进一步确定：

1. 页面视觉风格
2. 卡片设计
3. 专家会议视觉
4. 动态分析动画
5. 移动端布局
6. 与 M-PNT / M-ED 三个工作台统一视觉语言

这样四个 Agent 最终会形成 MealKey 的：

**AI 咨询工作台体系**
