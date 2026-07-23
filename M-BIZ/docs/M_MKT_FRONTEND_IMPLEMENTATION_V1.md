# M-MKT Frontend Implementation V1

> 模块：M-MKT
> 产品名：市场机会中心
> 英文名：Market Opportunity Center
> 文档角色：前端实现设计稿

## 一、产品定位

M-MKT 前端不是：

- 市场报告阅读器
- AI 聊天页面
- 数据仪表盘

而是：

> 创业者与 AI 市场咨询团队共同完成一次市场进入决策的工作台。

用户体验应接近：

- 麦肯锡战略咨询项目
- 红杉投资尽调
- 餐饮战略顾问会议

但表达方式必须是 AI 原生化的。

## 二、核心交互原则

冻结：

## 不一次展示全部答案

流程必须是：

```text
了解我

↓

分析市场

↓

发现机会

↓

专家讨论

↓

共同决策

↓

形成行动
```

用户每一步都要有参与感。

M-MKT 的价值不是“生成一份市场报告”，而是：

> 让用户经历一次专业市场进入判断过程。

## 三、页面结构

### 路由

```text
apps/web/src/app/(dashboard)/projects/[projectId]/market/page.tsx
```

### 页面容器

```tsx
<MarketOpportunityWorkspace />
```

### 整体骨架

```tsx
<MarketOpportunityWorkspace>
  <WorkspaceHeader />
  <MarketStageTimeline />
  <StageRenderer />
  <DecisionSummary />
  <NextStepRouter />
</MarketOpportunityWorkspace>
```

### 页面感知

```text
Header

项目：
长沙湘菜项目

市场机会中心

阶段：
市场判断中


Step Timeline

① 市场访谈
② 市场扫描
③ 机会评估
④ 专家会议
⑤ 决策形成


Current Workspace

动态内容


Decision Summary


下一步

进入品牌定位
```

## 四、第一屏设计

## Market Hero

目标：

用户进入页面 5 秒就知道：

> AI 正在帮我判断这个项目值不值得进入。

### 无结果时

```text
长沙 × 湘菜

市场机会中心


AI 正在评估：

这个市场是否值得进入


当前状态：

资料收集中
```

### 有结果时

```text
市场机会评分

82


判断：

存在结构性机会


最大风险：

传统湘菜竞争高度集中


建议：

进入年轻化湘菜赛道
```

### 组件

```text
MarketOpportunityHero.tsx
```

## 五、Stage 1 用户访谈界面

这是非常关键的一屏。

不要表单。

采用：

## AI 咨询访谈模式

页面状态示意：

```text
AI 市场顾问


为了判断长沙湘菜机会，
我需要先了解你的情况。


问题 1：

你为什么考虑做湘菜？

[创业机会]
[已有餐饮经验]
[品牌扩张]
[其他]
```

底部要有轻量进度：

```text
2/8
```

用户感觉不是填资料，而是被咨询。

### 组件

```text
FounderMarketInterview.tsx
```

### 组件树

```text
FounderMarketInterview
 ├─ InterviewQuestionCard
 ├─ InterviewOptionGroup
 ├─ InterviewProgress
 └─ InterviewInsightHint
```

## 六、Stage 2 市场智能分析

用户完成访谈后进入：

## Market Intelligence Room

不要直接显示报告。

先展示 AI 工作过程。

### 页面状态

```text
正在分析市场...


✓ 城市消费结构

✓ 品类生命周期

✓ 竞争格局

✓ 案例匹配


发现：

3 个关键市场信号
```

再逐步展开内容。

### 组件

```text
MarketResearchProgress.tsx
```

### 组件树

```text
MarketResearchProgress
 ├─ ResearchChecklist
 ├─ SignalCounter
 ├─ ResearchStatusBar
 └─ ExpandResultButton
```

## 七、市场判断主页

核心页面分成六大模块。

## A. 市场机会总览

第一块：

```text
市场机会


82/100


机会类型：

成熟品类升级机会


一句话判断：

湘菜市场仍有机会，
但机会不在传统湘菜。
```

### 组件

```text
OpportunityOverviewCard.tsx
```

## B. 市场底板

不是数据展示。

是判断。

例如：

```text
长沙市场


消费：

★★★★★

品类基础：

★★★★☆


竞争：

★★☆☆☆


判断：

消费基础强，
但本地品牌密度高。
```

### 组件

```text
MarketFoundationCard.tsx
```

## C. 机会发现

这是用户最感兴趣的一块。

卡片示意：

```text
发现机会 1


年轻消费迁移


过去：

家庭宴请


现在：

朋友社交


机会：

年轻湘菜空间


可信度：

88%
```

### 组件

```text
OpportunityPatternCard.tsx
```

## D. 专家委员会

这是 M-MKT 的差异化部分。

不要做聊天。

做会议室式结构。

页面示意：

```text
市场战略委员会


┌─────────────┐
│ 行业专家     │
│             │
│ 判断：       │
│ 有增长机会   │
└─────────────┘


┌─────────────┐
│ 经营专家     │
│             │
│ 风险较高     │
└─────────────┘


┌─────────────┐
│ 投资专家     │
│             │
│ 模型需验证   │
└─────────────┘
```

### 组件

```text
MarketCouncilCard.tsx
```

## E. 专家争议区

这是最重要的一块。

让用户看到：

> AI 不是直接生成，而是在组织不同判断。

示意：

```text
专家争议


行业专家：

市场值得进入


经营专家：

核心商圈竞争过强


投资专家：

复制模型不足


AI 总结：

机会存在，
但必须避开传统打法。
```

### 组件

```text
MarketDebatePanel.tsx
```

## F. 最终市场决策

最后不是报告。

而是：

## 决策

示意：

```text
市场进入建议


建议：

进入


原因：

1.
消费趋势支持

2.
存在价格带机会

3.
竞争空位明确


不建议：

传统湘菜馆


推荐下一步：

进入品牌定位中心
```

### 组件

```text
MarketDecisionCard.tsx
```

## 八、页面数据契约

前端只消费：

```typescript
MarketPageOutput
```

设计如下：

```typescript
type MarketPageOutput = {
  projectName: string

  market: {
    city: string
    category: string
  }

  stage: "interview" | "analysis" | "council" | "decision"

  overview: {
    score: number
    judgement: string
  }

  signals: Array<{
    title: string
    insight: string
    confidence: number
  }>

  foundation: {
    consumer: string
    competition: string
    trend: string
  }

  council: Array<{
    role: string
    opinion: string
  }>

  debate: {
    conflict: string[]
    consensus: string
  }

  decision: {
    result: string
    reasons: string[]
    risks: string[]
    nextAgent: string
  }
}
```

### 视图层补充契约

为了支持工作台布局，建议补两个前端层对象：

```typescript
type MarketHeader = {
  projectName: string
  city: string
  category: string
  stageLabel: string
  aiMessage: string
}

type MarketJourneyStep = {
  key: "interview" | "analysis" | "opportunity" | "council" | "decision"
  label: string
  status: "completed" | "current" | "upcoming"
}
```

## 九、状态设计

必须有三个状态。

## Empty

第一次进入：

```text
开始市场机会分析

AI 将通过 5 个步骤帮助判断

[开始]
```

## Running

AI 工作中：

```text
正在分析市场...

当前：

竞争格局分析

预计：

2 分钟
```

## Completed

展示完整结果。

### 前端状态枚举建议

```typescript
type MarketWorkspaceState = "empty" | "running" | "completed"
```

## 十、移动端设计

延续 MealKey 标准。

手机端首页顺序：

```text
机会评分

↓

最大风险

↓

一句判断

↓

专家观点

↓

进入下一步
```

不要横向表格。

不要多列密集卡片。

应改为单列判断流。

## 十一、组件目录

建议：

```text
components/operating/market/
  MarketWorkspace.tsx
  MarketHero.tsx
  MarketStageTimeline.tsx
  FounderInterview.tsx
  MarketResearchProgress.tsx
  OpportunityOverviewCard.tsx
  MarketFoundationCard.tsx
  OpportunityPatternCard.tsx
  MarketCouncilCard.tsx
  MarketDebatePanel.tsx
  MarketDecisionCard.tsx
  MarketHistoryCard.tsx
  MarketFeedbackCard.tsx
```

## 十二、和 M-PNT 对齐

可复用基础组件：

```text
MKPageHeader
MKMetaPill
PageState
AgentStream
DecisionCard
ReportCard
```

### 对齐逻辑

M-PNT：

```text
市场

↓

定位

↓

品牌方案
```

M-MKT：

```text
市场

↓

机会

↓

进入决策
```

### 关键差异

- M-PNT 的终点是定位契约
- M-MKT 的终点是进入判断
- M-PNT 的主问题是“怎么定位”
- M-MKT 的主问题是“值不值得进”

## 十三、React 页面结构

建议顶层结构：

```tsx
<MarketOpportunityWorkspace>
  <MKPageHeader />
  <MarketStageTimeline />
  <MarketOpportunityHero />
  <StageRenderer />
  <MarketDecisionCard />
  <NextAgentRouter />
</MarketOpportunityWorkspace>
```

### StageRenderer 结构

```tsx
function StageRenderer({ stage, data }: StageRendererProps) {
  switch (stage) {
    case "interview":
      return <FounderMarketInterview />
    case "analysis":
      return <MarketResearchProgress />
    case "council":
      return (
        <>
          <OpportunityOverviewCard />
          <MarketFoundationCard />
          <OpportunityPatternCard />
          <MarketCouncilCard />
          <MarketDebatePanel />
        </>
      )
    case "decision":
      return <MarketDecisionCard />
    default:
      return <EmptyMarketState />
  }
}
```

## 十四、Runtime 接口建议

前端不要拆着调零散能力。

前端只和 M-MKT Workspace Runtime 对话。

### 获取工作台

```http
GET /api/projects/:projectId/market/workspace
```

返回：

```typescript
MarketPageOutput
```

### 提交访谈

```http
POST /api/projects/:projectId/market/interview
```

### 启动市场分析

```http
POST /api/projects/:projectId/market/analyze
```

### 进入专家会议

```http
POST /api/projects/:projectId/market/council
```

### 冻结市场决策

```http
POST /api/projects/:projectId/market/decision
```

返回中必须带：

```typescript
type MarketDecisionResult = {
  result: string
  reasons: string[]
  risks: string[]
  nextAgent: "m-pnt"
}
```

## 十五、V1 开发顺序

## Phase 1

静态工作台：

完成：

- 页面骨架
- Stage Timeline
- 六大 Card

## Phase 2

接 Runtime：

接：

```text
marketContext.pageOutput
```

## Phase 3

接流式：

```text
/api/agent/stream

forceAgent="m-mkt"
```

实现：

AI 分析过程展示。

## Phase 4

接 MealKey 主链：

```text
World

↓

Meeting

↓

M-MKT

↓

M-PNT
```

## 十六、最终判断

M-MKT 前端 V1 的目标不是漂亮。

而是验证：

> 用户是否感觉自己正在接受一次专业市场战略咨询。

如果做到，用户第一次会明显感觉：

> 这不是一个分类 AI。

而是：

> AI 真的像一个餐饮战略团队。

## 十七、下一步

下一步建议继续设计：

## 《M-MKT Frontend Prototype 页面级原型（6 屏）》

把以下 6 屏完整画出来，作为开发参考：

1. 首页
2. 用户访谈页
3. 市场分析页
4. 专家会议页
5. 决策页
6. 下一步路由页
