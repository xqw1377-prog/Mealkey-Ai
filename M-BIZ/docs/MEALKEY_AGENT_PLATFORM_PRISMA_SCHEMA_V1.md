# MealKey Agent Platform Prisma Schema V1

> 文档类型：平台数据模型总表
> 日期：2026-07-11
> 目标：冻结 MealKey 作为 Agent Operating System 的核心对象关系，而不是继续堆业务表

## 1. 文档定位

这一版不是“把所有表都先放进 Prisma”。

这一版只解决一件事：

> MealKey 平台到底在管理什么对象，这些对象之间是什么关系。

平台目标固定为：

> 一个 Agent 可以独立运行；可以被 MealKey 管理；可以商业化；可以学习进化。

---

## 2. 最终 Domain ERD

```text
                     Identity

User
  ↓
Organization
  ↓
Project


                     Agent Core

AgentDefinition
  ↓
AgentVersion
  ↓
AgentRuntime
  ↓
AgentRun
  ↓
AgentTrace


                  Cognitive Kernel

AgentRun
  ↓
CognitiveSession
  ↓
CognitiveTrace
  ├────────────── EvidenceReference
  └────────────── ConfidenceModel


                     Intelligence

CognitiveSession ─────┬────────────── AgentOutcome
  ↓                   │
Decision              │
  ↓                   │
DecisionEvent         │
                      │
AgentVersion ──────── EvaluationResult
KnowledgeNode ─────── KnowledgeUsage
KnowledgeNode ─────── KnowledgeEdge


                     Commercial

AgentRun
  ↓
UsageRecord
  ↓
BillingAccount
  ↓
Subscription
  ↓
Invoice

AgentDefinition
  ↓
AgentListing
  ↓
RevenueShare
```

---

## 3. 架构原则冻结

### 原则 1

**Agent 不属于 MealKey。**

MealKey 管理 Agent。

### 原则 2

**Run 是事实，Dashboard 是投影。**

任何指标都不能来自页面逻辑，只能来自：

- `AgentRun`
- `UsageRecord`
- `DecisionEvent`
- 后续 Event Dictionary 中定义的事件流

### 原则 3

**Knowledge 不直接学习。**

学习回写链路固定为：

```text
AgentRun
  ↓
AgentOutcome
  ↓
EvaluationResult
  ↓
LearningRecord
  ↓
Knowledge Update
```

### 原则 4

**ChiefAgent 是入口，不是大脑。**

MealKey 的真正核心应冻结为：

> `Cognitive Kernel`

它统一负责：

- Context Load
- Knowledge Retrieve
- Rule Validate
- LLM Reason
- Evidence Link
- Confidence Breakdown
- Decision Build

---

## 4. Domain 划分

平台 V1 最终冻结为 7 个 Domain：

### 4.1 Identity Domain

- `User`
- `Organization`
- `OrganizationMember`
- `Project`

### 4.2 Agent Core Domain

- `AgentDefinition`
- `AgentVersion`
- `AgentRuntime`

### 4.3 Execution Domain

- `AgentRun`
- `AgentTrace`

### 4.4 Cognitive Kernel Domain

- `CognitiveSession`
- `CognitiveTrace`
- `EvidenceReference`
- `ConfidenceModel`

### 4.5 Intelligence Domain

- `AgentOutcome`
- `Decision`
- `DecisionEvent`
- `EvaluationResult`
- `LearningRecord`
- `KnowledgeNode`
- `KnowledgeEdge`
- `KnowledgeUsage`

### 4.6 Commercial Domain

- `UsageRecord`
- `BillingAccount`
- `Subscription`
- `Plan`
- `CreditLedger`
- `Invoice`

### 4.7 Marketplace Domain

- `AgentListing`
- `RevenueShare`

---

## 5. Identity Domain

### User

`User` 继续作为身份根对象存在。

这一版重点冻结的是 `Organization -> Project` 这一层平台能力，因此不在这里重写现有 `User` 模型。

### Organization

餐饮天然是 B2B 结构，平台从 V1 起就支持组织层，而不是未来再从 `User -> 企业` 迁移。

```prisma
model Organization {
  id              String               @id @default(cuid())
  name            String
  type            OrganizationType
  members         OrganizationMember[]
  billingAccounts BillingAccount[]
  createdAt       DateTime             @default(now())
}

enum OrganizationType {
  BRAND
  STORE_GROUP
  PARTNER
  PLATFORM
}
```

### OrganizationMember

```prisma
model OrganizationMember {
  id             String           @id @default(cuid())
  organizationId String
  userId         String
  role           OrganizationRole
  createdAt      DateTime         @default(now())
}

enum OrganizationRole {
  OWNER
  ADMIN
  MANAGER
  MEMBER
}
```

### Project

`Project` 保持为业务上下文容器，但允许挂到组织层。

```prisma
model Project {
  id             String      @id @default(cuid())
  organizationId String?
  ownerId        String
  name           String
  type           ProjectType
  createdAt      DateTime    @default(now())
}
```

---

## 6. Agent Core Domain

### AgentDefinition

定义：

> Agent 是什么。

```prisma
model AgentDefinition {
  id              String           @id @default(cuid())
  publisherId     String?
  name            String
  slug            String           @unique
  description     String?
  category        String
  capabilities    Json
  inputSchema     Json?
  outputSchema    Json?
  deploymentModes Json
  status          AgentStatus
  versions        AgentVersion[]
  runtimes        AgentRuntime[]
  listings        AgentListing[]
  createdAt       DateTime         @default(now())
}
```

### AgentVersion

定义：

> 当前这个 Agent 的哪个版本。

```prisma
model AgentVersion {
  id                String             @id @default(cuid())
  agentId           String
  version           String
  promptConfig      Json?
  toolConfig        Json?
  knowledgeSnapshot Json?
  releaseStatus     ReleaseStatus
  evaluations       EvaluationResult[]
  createdAt         DateTime           @default(now())
}
```

### AgentRuntime

解决：

> Agent 在哪里跑。

```prisma
model AgentRuntime {
  id            String           @id @default(cuid())
  agentId       String
  versionId     String
  runtimeType   RuntimeType
  ownerType     RuntimeOwnerType
  ownerId       String?
  status        RuntimeStatus
  lastHeartbeat DateTime?
  createdAt     DateTime         @default(now())
}

enum RuntimeType {
  MEALKEY_CLOUD
  STORE_EDGE
  CUSTOMER_SERVER
  PARTNER_RUNTIME
}

enum RuntimeOwnerType {
  PLATFORM
  ORGANIZATION
  USER
  PARTNER
}
```

---

## 7. Execution Domain

### AgentRun

最终事实：

> 一次执行。

```prisma
model AgentRun {
  id          String         @id @default(cuid())
  agentId     String
  runtimeId   String?
  versionId   String
  callerType  CallerType
  callerId    String?
  projectId   String?
  status      RunStatus
  inputRef    String?
  outputRef   String?
  startedAt   DateTime
  completedAt DateTime?
  latencyMs   Int?
  traces      AgentTrace[]
  usages      UsageRecord[]
  decisions   Decision[]
  outcomes    AgentOutcome[]
  createdAt   DateTime       @default(now())
}
```

### AgentTrace

执行链。

```prisma
model AgentTrace {
  id             String      @id @default(cuid())
  runId          String
  parentTraceId  String?
  type           TraceType
  source         TraceSource
  name           String
  inputSnapshot  Json?
  outputSnapshot Json?
  status         TraceStatus
  errorCode      String?
  retryCount     Int         @default(0)
  latencyMs      Int?
  sequence       Int
  createdAt      DateTime    @default(now())
}
```

---

## 8. Intelligence Domain

### CognitiveSession

MealKey 的判断链不再直接定义为 `LLM -> Decision`。

在 `AgentRun` 和 `Decision` 之间必须补一层认知会话：

```prisma
model CognitiveSession {
  id                 String              @id @default(cuid())
  agentRunId         String
  projectId          String?
  decisionId         String?
  contextSnapshotRef Json?
  status             CognitiveStatus
  confidenceRef      String?
  createdAt          DateTime            @default(now())
  traces             CognitiveTrace[]
  evidences          EvidenceReference[]
}
```

### CognitiveTrace

`CognitiveTrace` 是 Protocol 8 的核心事实，不再叫 `KnowledgeTrace`。

它记录：

- 读取了什么上下文
- 命中了什么知识
- 触发了什么规则
- 进行了什么推理
- 如何形成最终判断

```prisma
model CognitiveTrace {
  id         String             @id @default(cuid())
  sessionId  String
  type       CognitiveTraceType
  sourceType CognitiveSourceType
  sourceId   String?
  input      Json?
  output     Json?
  confidence Float?
  weight     Float?
  sequence   Int
  createdAt  DateTime           @default(now())
}
```

### EvidenceReference

`Decision.evidence` 不应再停留在字符串数组。

MealKey 需要知道：

- 证据来自哪里
- 对当前判断贡献多少
- 当前证据可信度是多少

```prisma
model EvidenceReference {
  id           String             @id @default(cuid())
  sessionId    String
  decisionId   String?
  type         EvidenceType
  sourceType   EvidenceSourceType
  sourceId     String
  contribution Float
  confidence   Float?
  metadata     Json?
  createdAt    DateTime           @default(now())
}
```

### ConfidenceModel

`confidence` 不应只有一个总分。

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

### AgentOutcome

不是所有 Agent 都会产出 `Decision`，所以必须补一层通用结果层。

```prisma
model AgentOutcome {
  id         String        @id @default(cuid())
  runId      String
  metricType String
  value      Decimal
  unit       String?
  source     OutcomeSource
  createdAt  DateTime      @default(now())
}

enum OutcomeSource {
  SYSTEM
  USER
  EXTERNAL
}
```

### Decision

高级智能结果。

```prisma
model Decision {
  id                 String         @id @default(cuid())
  runId              String
  cognitiveSessionId String?
  type               String
  content            Json
  confidenceRef      String?
  currentStatus      DecisionStatus
  events             DecisionEvent[]
  evidences          EvidenceReference[]
  createdAt          DateTime       @default(now())
}
```

### DecisionEvent

事实流。

```prisma
model DecisionEvent {
  id         String            @id @default(cuid())
  decisionId String
  type       DecisionEventType
  metadata   Json?
  createdAt  DateTime          @default(now())
}
```

### EvaluationResult

```prisma
model EvaluationResult {
  id                String         @id @default(cuid())
  agentVersionId    String
  type              EvaluationType
  dataset           String?
  sampleSize        Int?
  baselineVersionId String?
  score             Float
  metricBreakdown   Json?
  riskLevel         String?
  createdAt         DateTime       @default(now())
}
```

### LearningRecord

学习中间层，不等于知识本体。

```prisma
model LearningRecord {
  id         String         @id @default(cuid())
  agentId    String
  runId      String?
  type       LearningType
  content    Json
  confidence Float
  status     LearningStatus
  createdAt  DateTime       @default(now())
}
```

### KnowledgeNode

`KnowledgeNode` 在 V1 不再只被视为知识库条目，而是知识图谱中的节点。

```prisma
model KnowledgeNode {
  id          String          @id @default(cuid())
  category    String
  scene       String?
  content     Json
  source      String?
  weight      Float
  effectScore Float?
  status      KnowledgeStatus
  createdAt   DateTime        @default(now())
}
```

### KnowledgeEdge

知识系统需要支持图谱关系，而不是只有孤立 Node。

```prisma
model KnowledgeEdge {
  id           String   @id @default(cuid())
  fromNodeId   String
  toNodeId     String
  relationType String
  weight       Float?
  createdAt    DateTime @default(now())
}
```

### KnowledgeUsage

```prisma
model KnowledgeUsage {
  id                String   @id @default(cuid())
  knowledgeId       String
  runId             String?
  decisionId        String?
  agentVersionId    String
  attributionWeight Float?
  createdAt         DateTime @default(now())
}
```

---

## 9. Commercial Domain

### UsageRecord

`UsageRecord` 继续作为资源消耗唯一事实源。

```prisma
model UsageRecord {
  id               String     @id @default(cuid())
  runId            String?
  runtimeId        String?
  agentId          String
  versionId        String?
  billingAccountId String?
  usageType        UsageType
  provider         String?
  model            String?
  tokenInput       Int
  tokenOutput      Int
  tokenCached      Int
  tokenReasoning   Int
  tokenTotal       Int
  cost             Decimal
  currency         Currency
  billable         Boolean
  externalUsageId  String?
  createdAt        DateTime   @default(now())
}
```

### BillingAccount

```prisma
model BillingAccount {
  id             String        @id @default(cuid())
  organizationId String?
  ownerId        String?
  mode           BillingMode
  status         BillingStatus
  currency       Currency
  createdAt      DateTime      @default(now())
}
```

### Subscription

```prisma
model Subscription {
  id               String             @id @default(cuid())
  billingAccountId String
  planId           String
  status           SubscriptionStatus
  startAt          DateTime
  endAt            DateTime?
}
```

### Plan

```prisma
model Plan {
  id             String    @id @default(cuid())
  name           String
  type           PlanType
  includedTokens Int?
  price          Decimal
  currency       Currency
}
```

### CreditLedger

```prisma
model CreditLedger {
  id               String           @id @default(cuid())
  billingAccountId String
  changeType       CreditChangeType
  amount           Decimal
  balanceAfter     Decimal
  relatedUsageId   String?
  createdAt        DateTime         @default(now())
}
```

### Invoice

```prisma
model Invoice {
  id               String        @id @default(cuid())
  billingAccountId String
  periodStart      DateTime
  periodEnd        DateTime
  subtotal         Decimal
  total            Decimal
  status           InvoiceStatus
}
```

---

## 10. Marketplace Domain

### AgentListing

```prisma
model AgentListing {
  id           String       @id @default(cuid())
  agentId      String
  publisherId  String
  title        String
  pricingModel PricingModel
  status       ListingStatus
  createdAt    DateTime     @default(now())
}
```

### RevenueShare

```prisma
model RevenueShare {
  id               String   @id @default(cuid())
  listingId        String
  invoiceId        String
  gross            Decimal
  platformAmount   Decimal
  publisherAmount  Decimal
}
```

---

## 11. 平台能力映射

| 能力 | 核心模型 |
| --- | --- |
| Agent 商城 | `AgentDefinition` + `AgentListing` |
| Agent 部署 | `AgentRuntime` |
| Agent 运行监控 | `AgentRun` + `AgentTrace` |
| 认知内核 | `CognitiveSession` + `CognitiveTrace` + `EvidenceReference` + `ConfidenceModel` |
| 成本统计 | `UsageRecord` |
| 收费 | `BillingAccount` + `Subscription` + `Invoice` |
| 经营智能 | `Decision` |
| 结果反馈 | `AgentOutcome` |
| 模型优化 | `EvaluationResult` |
| 知识壁垒 | `KnowledgeNode` + `KnowledgeUsage` |
| 自动进化 | `LearningRecord` |

---

## 12. 关系规则冻结

### 12.1 Cardinality

```text
Organization 1:N OrganizationMember
Organization 1:N Project
Organization 1:N BillingAccount

AgentDefinition 1:N AgentVersion
AgentDefinition 1:N AgentRuntime
AgentDefinition 1:N AgentListing

AgentVersion 1:N EvaluationResult

AgentRuntime 1:N AgentRun
AgentRun 1:N AgentTrace
AgentRun 1:N CognitiveSession
AgentRun 1:N UsageRecord
AgentRun 1:N Decision
AgentRun 1:N AgentOutcome

CognitiveSession 1:N CognitiveTrace
CognitiveSession 1:N EvidenceReference
CognitiveSession 1:1 ConfidenceModel

Decision 1:N EvidenceReference
Decision 1:N DecisionEvent

KnowledgeNode 1:N KnowledgeUsage
KnowledgeNode 1:N KnowledgeEdge
AgentVersion 1:N KnowledgeUsage

BillingAccount 1:N Subscription
BillingAccount 1:N CreditLedger
BillingAccount 1:N Invoice
BillingAccount 1:N UsageRecord

AgentListing 1:N RevenueShare
Invoice 1:N RevenueShare
```

### 12.2 Source of Truth

| 对象 | 角色 |
| --- | --- |
| `AgentRun` | 执行事实摘要 |
| `AgentTrace` | 运行链路事实 |
| `CognitiveTrace` | 认知路径事实 |
| `EvidenceReference` | 判断依据归因事实 |
| `DecisionEvent` | 决策状态事实 |
| `UsageRecord` | 资源消耗事实 |
| `CreditLedger` | 账务变动事实 |
| `Invoice` | 周期结算结果 |

规则固定为：

- `Decision.currentStatus` 是 projection，不是事实源
- `Dashboard` 只读事实表与事件流，不自己算业务真相
- `UsageRecord` 只追加，不静默覆盖

---

## 13. 与现有 Schema 的迁移判断

当前 `apps/web/prisma/schema.prisma` 仍然明显偏旧应用模型，例如：

- `Owner`
- 旧 `AgentRun`
- 旧 `Decision`
- `AgentProduct`
- `AgentRun.tokens`

这些对象可以继续作为兼容层存在，但不再代表平台 V1 的目标模型。

建议迁移顺序：

### 阶段 1：先加平台新对象

- `Organization`
- `OrganizationMember`
- `AgentDefinition`
- `AgentVersion`
- `AgentRuntime`
- `AgentTrace`
- `CognitiveSession`
- `CognitiveTrace`
- `EvidenceReference`
- `ConfidenceModel`
- `AgentOutcome`
- `EvaluationResult`
- `LearningRecord`
- `KnowledgeEdge`
- `KnowledgeUsage`
- `BillingAccount`
- `Subscription`
- `Plan`
- `CreditLedger`
- `Invoice`
- `AgentListing`
- `RevenueShare`

### 阶段 2：读路径迁移

把：

- Runtime 监控
- Dashboard 指标
- Billing
- Marketplace
- Learning

逐步切到新模型。

### 阶段 3：旧字段降级为兼容层

例如：

- `AgentRun.tokens`
- `AgentProduct.pricing`

只保留历史兼容，不再继续扩展。

---

## 14. 最终结论

到这里，MealKey 的数据库已经从：

> 餐饮 AI 应用数据库

升级成：

> Agent Operating System 数据模型

Schema 解决的是：

> 存什么

下一步直接进入：

## 《MealKey Event Dictionary V1》

因为接下来要解决的是：

> 谁在什么时候产生什么数据
