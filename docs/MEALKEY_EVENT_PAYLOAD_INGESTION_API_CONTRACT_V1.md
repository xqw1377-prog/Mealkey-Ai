# MealKey Event Payload & Ingestion API Contract V1

> 文档类型：事件 Payload 与接入协议
> 日期：2026-07-11
> 目标：冻结 Runtime 上报事件时的严格字段、验签、幂等、落库与消费规则

## 1. 文档定位

到这里，MealKey 已经冻结了两层：

- `Prisma Schema V1`：存什么
- `Event Dictionary V1`：谁在什么时候产生什么

这一份继续往前走一层，解决：

> 事件到底怎么上报，平台怎么验证，怎么去重，怎么入库，怎么驱动 Dashboard / Billing / Learning

---

## 2. 协议原则

### 原则 1

Envelope 固定，Payload 分事件类型严格校验。

### 原则 2

先验签，后校验，先落原始事件，再更新事实表。

### 原则 3

事件只追加，不修改历史事件。

### 原则 4

幂等优先于吞吐。

任何外部 Runtime 的重试都不能污染：

- `UsageRecord`
- `Invoice`
- `RevenueShare`
- `DecisionEvent`

### 原则 5

Raw Event、Fact Table、Projection 必须解耦。

---

## 3. 标准 Envelope Schema

```ts
type EventSource = "MEALKEY" | "EXTERNAL_RUNTIME" | "PARTNER" | "SYSTEM"

type MealKeyEventEnvelope<TPayload> = {
  eventId: string
  eventName: string
  eventVersion: 1
  occurredAt: string

  entityType: string
  entityId: string

  agentId?: string
  versionId?: string
  runtimeId?: string
  runId?: string
  traceId?: string
  decisionId?: string
  projectId?: string
  organizationId?: string
  billingAccountId?: string
  invoiceId?: string
  listingId?: string

  producer: string
  source: EventSource
  sequence?: number
  idempotencyKey?: string
  payload: TPayload
}
```

### 必填字段

| 字段 | 说明 |
| --- | --- |
| `eventId` | 全局唯一事件 ID |
| `eventName` | 固定事件名，如 `run.completed` |
| `eventVersion` | 当前固定为 `1` |
| `occurredAt` | 事实发生时间 |
| `entityType` | 事件锚点对象类型 |
| `entityId` | 事件锚点对象 ID |
| `producer` | 生产者标识 |
| `source` | 事件来源 |
| `payload` | 事件体 |

### 关联字段规则

| 场景 | 必须字段 |
| --- | --- |
| Run 级事件 | `runId` |
| Trace 级事件 | `runId` + `traceId` |
| Decision 级事件 | `decisionId` |
| Usage 级事件 | `billingAccountId` 或 `runId` 至少其一 |
| Invoice 级事件 | `invoiceId` |
| Listing 级事件 | `listingId` |

### 时间规则

- `occurredAt` 使用 ISO 8601 UTC
- 平台接收时间单独记为 `receivedAt`
- 所有 Dashboard 时间窗口以 `occurredAt` 为准，不以 `receivedAt` 为准

---

## 4. 通用校验规则

### 4.1 ID 规则

- 所有 ID 必须是字符串
- 平台不要求外部 Runtime 使用 cuid，但必须全局唯一
- 推荐格式：

```text
evt_xxx
run_xxx
trc_xxx
dec_xxx
usage_xxx
inv_xxx
```

### 4.2 枚举规则

- 枚举值必须严格匹配文档定义
- 不接受大小写混传
- 未知枚举值直接拒绝入库

### 4.3 Decimal 规则

以下字段统一用字符串上传，避免浮点误差：

- `cost`
- `gross`
- `platformAmount`
- `publisherAmount`
- `amount`
- `balanceAfter`
- `subtotal`
- `total`
- `value`（当结果值为金额/比例时建议字符串）

### 4.4 Null 规则

- 未提供字段用“缺省”，不要传 `null`
- 只有 schema 明确允许的字段才允许 `null`

### 4.5 Unknown Field 规则

- Envelope 不允许未知顶层字段
- Payload 默认不允许未知字段
- 需要前向兼容时，只能通过 `payload.extensions` 扩展

---

## 5. 核心 Payload Schema

以下为 V1 必须严格支持的事件类型。

## 5.1 Run

### `run.created`

```ts
type RunCreatedPayload = {
  callerType: "USER" | "SYSTEM" | "API" | "SCHEDULE"
  callerId?: string
  status: "CREATED"
  inputRef?: string
  projectId?: string
}
```

### `run.started`

```ts
type RunStartedPayload = {
  status: "RUNNING"
  startedAt: string
}
```

### `run.completed`

```ts
type RunCompletedPayload = {
  status: "SUCCESS"
  completedAt: string
  latencyMs: number
  outputRef?: string
}
```

### `run.failed`

```ts
type RunFailedPayload = {
  status: "FAILED"
  completedAt: string
  latencyMs?: number
  errorCode: string
  errorMessage?: string
}
```

## 5.2 Trace

### `trace.created`

```ts
type TraceCreatedPayload = {
  type: string
  source: string
  name: string
  sequence: number
  parentTraceId?: string
  inputSnapshotRef?: string
}
```

### `trace.completed`

```ts
type TraceCompletedPayload = {
  status: "SUCCESS"
  latencyMs: number
  outputSnapshotRef?: string
}
```

### `trace.failed`

```ts
type TraceFailedPayload = {
  status: "FAILED"
  errorCode: string
  retryCount?: number
  latencyMs?: number
}
```

## 5.3 Intelligence

### `outcome.recorded`

```ts
type OutcomeRecordedPayload = {
  metricType: string
  value: string
  unit?: string
  source: "SYSTEM" | "USER" | "EXTERNAL"
}
```

### `decision.created`

```ts
type DecisionCreatedPayload = {
  type: string
  content: Record<string, unknown>
  confidence?: number
}
```

### `decision.status_changed`

```ts
type DecisionStatusChangedPayload = {
  from: string
  to: string
  eventType: string
  metadata?: Record<string, unknown>
}
```

### `evaluation.completed`

```ts
type EvaluationCompletedPayload = {
  type: string
  dataset?: string
  sampleSize?: number
  baselineVersionId?: string
  score: number
  riskLevel?: string
  metricBreakdown?: Record<string, unknown>
}
```

### `learning.recorded`

```ts
type LearningRecordedPayload = {
  type: string
  content: Record<string, unknown>
  confidence: number
  status: "OBSERVED" | "REVIEWED" | "APPROVED" | "APPLIED"
}
```

### `knowledge.used`

```ts
type KnowledgeUsedPayload = {
  knowledgeId: string
  agentVersionId: string
  attributionWeight?: number
}
```

## 5.4 Commercial

### `usage.recorded`

```ts
type UsageRecordedPayload = {
  usageType: "LLM" | "EMBEDDING" | "OCR" | "ASR" | "TOOL" | "EVALUATION" | "SYSTEM"
  provider?: string
  model?: string
  tokenInput: number
  tokenOutput: number
  tokenCached: number
  tokenReasoning: number
  tokenTotal: number
  cost: string
  currency: string
  billable: boolean
  externalUsageId?: string
}
```

规则：

- `tokenTotal` 必须等于四类 token 之和
- `cost >= 0`
- `billable = false` 时，仍允许 `cost > 0`

### `subscription.activated`

```ts
type SubscriptionActivatedPayload = {
  planId: string
  status: "ACTIVE"
  startAt: string
  endAt?: string
}
```

### `credit.changed`

```ts
type CreditChangedPayload = {
  changeType: string
  amount: string
  balanceAfter: string
  relatedUsageId?: string
}
```

### `invoice.issued`

```ts
type InvoiceIssuedPayload = {
  periodStart: string
  periodEnd: string
  subtotal: string
  total: string
  status: "ISSUED"
}
```

## 5.5 Marketplace

### `listing.published`

```ts
type ListingPublishedPayload = {
  title: string
  pricingModel: string
  status: "PUBLISHED"
}
```

### `revenue_share.calculated`

```ts
type RevenueShareCalculatedPayload = {
  invoiceId: string
  gross: string
  platformAmount: string
  publisherAmount: string
}
```

规则：

- `gross = platformAmount + publisherAmount`

---

## 6. Ingestion API

V1 冻结两个入口：

- 单事件：`POST /api/platform/events/ingest`
- 批量事件：`POST /api/platform/events/batch`

---

## 7. 单事件接入

### Endpoint

```http
POST /api/platform/events/ingest
Content-Type: application/json
Authorization: Bearer <token>
X-MealKey-Producer: runtime-store-001
X-MealKey-Timestamp: 1720699200
X-MealKey-Signature: sha256=<hex>
Idempotency-Key: evt_xxx
```

### Request Body

```json
{
  "eventId": "evt_01j0demo",
  "eventName": "run.completed",
  "eventVersion": 1,
  "occurredAt": "2026-07-11T12:00:08.000Z",
  "entityType": "AgentRun",
  "entityId": "run_01j0demo",
  "agentId": "agt_brand_strategist",
  "versionId": "ver_1_2_0",
  "runtimeId": "rt_store_001",
  "runId": "run_01j0demo",
  "projectId": "prj_hz_001",
  "producer": "runtime-store-001",
  "source": "EXTERNAL_RUNTIME",
  "sequence": 9,
  "idempotencyKey": "evt_01j0demo",
  "payload": {
    "status": "SUCCESS",
    "completedAt": "2026-07-11T12:00:08.000Z",
    "latencyMs": 8000,
    "outputRef": "blob://runs/run_01j0demo/output.json"
  }
}
```

### Success Response

```json
{
  "ok": true,
  "accepted": true,
  "eventId": "evt_01j0demo",
  "deduplicated": false,
  "receivedAt": "2026-07-11T12:00:08.200Z"
}
```

### Duplicate Response

```json
{
  "ok": true,
  "accepted": true,
  "eventId": "evt_01j0demo",
  "deduplicated": true,
  "receivedAt": "2026-07-11T12:00:08.200Z"
}
```

### Error Response

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "payload.latencyMs is required for run.completed"
  }
}
```

---

## 8. 批量事件接入

### Endpoint

```http
POST /api/platform/events/batch
```

### Request Body

```json
{
  "producer": "runtime-store-001",
  "events": [
    {
      "eventId": "evt_1",
      "eventName": "run.started",
      "eventVersion": 1,
      "occurredAt": "2026-07-11T12:00:00.000Z",
      "entityType": "AgentRun",
      "entityId": "run_1",
      "runId": "run_1",
      "producer": "runtime-store-001",
      "source": "EXTERNAL_RUNTIME",
      "payload": {
        "status": "RUNNING",
        "startedAt": "2026-07-11T12:00:00.000Z"
      }
    }
  ]
}
```

### Response

```json
{
  "ok": true,
  "acceptedCount": 1,
  "deduplicatedCount": 0,
  "rejected": []
}
```

### 批量规则

- 单批建议不超过 `500` 条
- 单批最大 body 建议不超过 `5MB`
- 批量内逐条校验、逐条返回结果
- 不使用“整批全部失败”作为默认策略

---

## 9. 验签与鉴权

## 9.1 内部 Producer

MealKey 内部服务使用：

- `Authorization: Bearer <service-token>`

## 9.2 外部 Runtime

外部 Runtime 使用：

- `Authorization: Bearer <runtime-token>`
- `X-MealKey-Timestamp`
- `X-MealKey-Signature`

签名原文固定为：

```text
<timestamp>.<raw_body>
```

签名算法固定为：

```text
HMAC-SHA256
```

Header 形式：

```text
X-MealKey-Signature: sha256=<hex>
```

### 防重放规则

- 请求时间与服务器时间差超过 `300s` 直接拒绝
- 相同 `timestamp + signature` 在短窗口内只接受一次

---

## 10. 幂等与去重

平台按以下优先级去重：

### 一级键

- `eventId`

### 二级键

- `idempotencyKey`

### 三级键

- `producer + eventName + entityId + occurredAt`

规则：

- 任一命中即视为重复
- 重复事件返回 `200`，但 `deduplicated = true`
- 平台绝不因为重试导致多扣费、多分润、多记 usage

---

## 11. 入库流程

平台处理顺序固定为：

```text
Receive Request
  ↓
Authenticate
  ↓
Verify Signature
  ↓
Validate Envelope
  ↓
Validate Payload Schema
  ↓
Check Idempotency
  ↓
Insert Raw Event
  ↓
Apply Fact Table Mutation
  ↓
Emit Internal Consumer Jobs
  ↓
Update Projections
```

### Raw Event 层建议

建议新增原始事件表，例如：

```prisma
model PlatformEvent {
  id             String   @id @default(cuid())
  eventId        String   @unique
  eventName      String
  eventVersion   Int
  producer       String
  source         String
  entityType     String
  entityId       String
  runId          String?
  traceId        String?
  decisionId     String?
  billingAccountId String?
  occurredAt     DateTime
  receivedAt     DateTime @default(now())
  payload        Json
  rawBody        Json
}
```

这个表不是业务真相层，而是：

- 接入审计层
- 重放层
- 排错层

---

## 12. Consumer Contract

### Dashboard Consumer

只消费：

- `run.*`
- `trace.*`
- `decision.*`
- `usage.recorded`
- `invoice.*`

只写投影，不回写原事件。

### Billing Consumer

只消费：

- `usage.recorded`
- `subscription.*`
- `credit.changed`
- `invoice.*`
- `revenue_share.calculated`

### Learning Consumer

只消费：

- `outcome.recorded`
- `evaluation.completed`
- `learning.*`
- `knowledge.*`

学习链必须遵守：

```text
Run
  ↓
Outcome
  ↓
Evaluation
  ↓
LearningRecord
  ↓
Knowledge Update
```

---

## 13. 错误码冻结

```text
INVALID_SIGNATURE
TIMESTAMP_EXPIRED
UNAUTHORIZED_PRODUCER
INVALID_ENVELOPE
INVALID_PAYLOAD
UNKNOWN_EVENT_NAME
UNSUPPORTED_EVENT_VERSION
DUPLICATE_EVENT
ENTITY_CONFLICT
OUT_OF_ORDER_EVENT
INTERNAL_INGESTION_ERROR
```

### 错误处理规则

- `DUPLICATE_EVENT` 不算失败，按成功返回
- `OUT_OF_ORDER_EVENT` 可接收，但必须进入异常队列
- `INVALID_SIGNATURE` / `INVALID_PAYLOAD` 直接拒绝入库

---

## 14. 对现有系统的落地建议

V1 不建议一上来就把现有 tRPC 全部事件化。

先加一条新的平台入口：

```text
POST /api/platform/events/ingest
POST /api/platform/events/batch
```

优先让以下链路先接入：

1. `run.started`
2. `run.completed`
3. `run.failed`
4. `trace.failed`
5. `usage.recorded`
6. `decision.created`
7. `decision.accepted`
8. `outcome.recorded`

这样就已经能先跑起来：

- Runtime Observability
- 基础 Dashboard
- Token / Cost Monitor
- Decision Funnel

---

## 15. 最终结论

到这里，MealKey 平台已经冻结了三层：

1. `Prisma Schema V1`
2. `Event Dictionary V1`
3. `Event Payload & Ingestion API Contract V1`

下一步最合理的是进入：

## 《MealKey Platform Migration Plan V1》

把这三层从文档推进到工程：

- 先加哪些表
- 先接哪些事件
- 先改哪些 dashboard 指标
- 怎样在不打断现有业务页的前提下完成迁移
