# MealKey Event Dictionary V1

> 文档类型：事件词典
> 日期：2026-07-11
> 目标：冻结 MealKey 平台里“谁在什么时候产生什么数据”

## 1. 文档定位

`Prisma Schema V1` 解决的是：

> 存什么

`Event Dictionary V1` 解决的是：

> 谁在什么时候产生什么事件，以及这些事件怎么被 Runtime、Dashboard、Learning、Billing 消费

这份文档是以下系统的共同契约：

- Runtime
- Observability
- Dashboard
- Learning
- Billing
- Marketplace

---

## 2. 事件总原则

### 原则 1

事件是事实，不是页面状态。

### 原则 2

事件只追加，不回写历史。

### 原则 3

任何聚合指标都必须来自：

- 事实表
- 事件流

不能来自页面临时计算。

### 原则 4

状态字段是 projection，事件才是状态变化事实。

例如：

- `Decision.currentStatus` 是投影
- `DecisionEvent` 才是状态变化事实

---

## 3. 标准事件 Envelope

所有平台事件统一使用同一层 Envelope。

```ts
type MealKeyEvent<TPayload = Record<string, unknown>> = {
  eventId: string
  eventName: string
  eventVersion: number
  occurredAt: string

  entityType: string
  entityId: string

  agentId?: string
  versionId?: string
  runtimeId?: string
  runId?: string
  traceId?: string
  sessionId?: string
  cognitiveTraceId?: string
  decisionId?: string
  projectId?: string
  organizationId?: string
  billingAccountId?: string
  invoiceId?: string
  listingId?: string

  producer: string
  source: "MEALKEY" | "EXTERNAL_RUNTIME" | "PARTNER" | "SYSTEM"
  idempotencyKey?: string

  payload: TPayload
}
```

### 必填规则

- `eventId`：全局唯一
- `eventName`：固定枚举名
- `occurredAt`：事实发生时间，不是入库时间
- `entityType` + `entityId`：事件锚点
- `producer`：谁发的
- `payload`：事件体

### 关联规则

- 执行链事件优先挂 `runId`
- 认知链事件优先挂 `sessionId`
- 计费链事件优先挂 `billingAccountId`
- 商城链事件优先挂 `listingId`
- 学习链事件优先挂 `versionId` 和 `runId`

---

## 4. 命名规则

统一格式：

```text
domain.object.action
```

例子：

- `run.started`
- `trace.failed`
- `decision.accepted`
- `usage.recorded`
- `invoice.issued`

---

## 5. Runtime & Execution Events

### `run.created`

- 触发时机：`AgentRun` 创建
- 生产者：Runtime / API Gateway / Scheduler
- 实体锚点：`AgentRun`

关键 payload：

```json
{
  "callerType": "USER",
  "callerId": "usr_xxx",
  "status": "CREATED",
  "inputRef": "blob://...",
  "projectId": "prj_xxx"
}
```

### `run.started`

- 触发时机：Run 实际开始执行
- 生产者：Runtime Worker

关键 payload：

```json
{
  "status": "RUNNING",
  "startedAt": "2026-07-11T12:00:00.000Z"
}
```

### `run.completed`

- 触发时机：Run 正常结束
- 生产者：Runtime Worker

关键 payload：

```json
{
  "status": "SUCCESS",
  "completedAt": "2026-07-11T12:00:08.000Z",
  "latencyMs": 8000,
  "outputRef": "blob://..."
}
```

### `run.failed`

- 触发时机：Run 失败
- 生产者：Runtime Worker

关键 payload：

```json
{
  "status": "FAILED",
  "completedAt": "2026-07-11T12:00:08.000Z",
  "latencyMs": 8000,
  "errorCode": "MODEL_TIMEOUT"
}
```

### `run.cancelled`

- 触发时机：用户或系统中断执行

### `trace.created`

- 触发时机：创建新的 `AgentTrace`
- 生产者：Runtime / Tool Orchestrator

关键 payload：

```json
{
  "type": "LLM_CALL",
  "source": "RUNTIME",
  "name": "planner.step",
  "sequence": 3,
  "parentTraceId": "trc_parent"
}
```

### `trace.completed`

- 触发时机：某个 trace 成功结束

关键 payload：

```json
{
  "status": "SUCCESS",
  "latencyMs": 1240
}
```

### `trace.failed`

- 触发时机：某个 trace 失败

关键 payload：

```json
{
  "status": "FAILED",
  "errorCode": "TOOL_UNAVAILABLE",
  "retryCount": 1,
  "latencyMs": 2000
}
```

---

## 6. Intelligence Events

### `cognitive.session.started`

- 触发时机：创建 `CognitiveSession`
- 生产者：Cognitive Kernel

关键 payload：

```json
{
  "status": "STARTED",
  "contextSnapshotRef": "blob://context/snap_001"
}
```

### `cognitive.trace.recorded`

- 触发时机：写入 `CognitiveTrace`
- 生产者：Cognitive Kernel

关键 payload：

```json
{
  "type": "KNOWLEDGE_RETRIEVE",
  "sourceType": "KNOWLEDGE_NODE",
  "sourceId": "kn_102",
  "confidence": 0.86,
  "weight": 0.35,
  "sequence": 3
}
```

### `evidence.linked`

- 触发时机：证据与 `Decision` 建立引用关系
- 生产者：Decision Intelligence

关键 payload：

```json
{
  "type": "SUPPORT",
  "sourceType": "KNOWLEDGE_NODE",
  "sourceId": "kn_102",
  "contribution": 0.35,
  "confidence": 0.86
}
```

### `confidence.scored`

- 触发时机：完成一次置信度拆解
- 生产者：Cognitive Kernel

关键 payload：

```json
{
  "overall": 0.84,
  "components": {
    "dataConfidence": 0.91,
    "knowledgeConfidence": 0.82,
    "ruleConfidence": 0.9,
    "llmConfidence": 0.76,
    "historicalConfidence": 0.71
  }
}
```

### `outcome.recorded`

- 触发时机：写入 `AgentOutcome`
- 生产者：Runtime / External Runtime / User Feedback Service

关键 payload：

```json
{
  "metricType": "CONVERSION_RATE",
  "value": "0.18",
  "unit": "ratio",
  "source": "SYSTEM"
}
```

### `decision.created`

- 触发时机：首次形成 `Decision`
- 生产者：Decision Engine

关键 payload：

```json
{
  "type": "BRAND_POSITIONING",
  "confidence": 0.82
}
```

### `decision.status_changed`

- 触发时机：`Decision.currentStatus` 发生变化
- 生产者：Decision Service

关键 payload：

```json
{
  "from": "CREATED",
  "to": "ACCEPTED",
  "eventType": "ACCEPTED"
}
```

### `decision.accepted`

- 触发时机：用户确认采用

### `decision.rejected`

- 触发时机：用户明确否决

### `decision.executed`

- 触发时机：决策进入执行动作

### `evaluation.completed`

- 触发时机：写入 `EvaluationResult`
- 生产者：Evaluation Service

关键 payload：

```json
{
  "type": "OFFLINE_BENCHMARK",
  "dataset": "market-v1",
  "sampleSize": 120,
  "baselineVersionId": "ver_prev",
  "score": 0.78,
  "riskLevel": "MEDIUM"
}
```

### `learning.recorded`

- 触发时机：创建 `LearningRecord`
- 生产者：Learning Pipeline

关键 payload：

```json
{
  "type": "PATTERN_CANDIDATE",
  "confidence": 0.76,
  "status": "OBSERVED"
}
```

### `learning.status_changed`

- 触发时机：学习记录从观察进入评审、批准、应用

### `knowledge.created`

- 触发时机：新增 `KnowledgeNode`

### `knowledge.updated`

- 触发时机：已有 `KnowledgeNode` 被修订

### `knowledge.weight_adjusted`

- 触发时机：Learning Engine 根据结果反馈调整知识、规则或案例权重
- 生产者：Learning Pipeline

关键 payload：

```json
{
  "sourceType": "RULE",
  "sourceId": "R027",
  "fromWeight": 0.8,
  "toWeight": 0.92,
  "reason": "success_rate_improved"
}
```

### `knowledge.used`

- 触发时机：写入 `KnowledgeUsage`

关键 payload：

```json
{
  "knowledgeId": "kn_xxx",
  "agentVersionId": "ver_xxx",
  "attributionWeight": 0.42
}
```

---

## 7. Commercial Events

### `usage.recorded`

- 触发时机：写入 `UsageRecord`
- 生产者：Runtime / External Runtime Reporter

关键 payload：

```json
{
  "usageType": "LLM",
  "provider": "openai",
  "model": "gpt-5",
  "tokenInput": 1200,
  "tokenOutput": 680,
  "tokenCached": 0,
  "tokenReasoning": 240,
  "tokenTotal": 2120,
  "cost": "0.634500",
  "currency": "CNY",
  "billable": true,
  "externalUsageId": "ext_usage_xxx"
}
```

### `billing.account_created`

- 触发时机：创建 `BillingAccount`

### `subscription.activated`

- 触发时机：订阅生效

关键 payload：

```json
{
  "planId": "plan_pro",
  "status": "ACTIVE",
  "startAt": "2026-07-11T00:00:00.000Z"
}
```

### `subscription.cancelled`

- 触发时机：订阅取消或到期失效

### `credit.changed`

- 触发时机：写入 `CreditLedger`

关键 payload：

```json
{
  "changeType": "USAGE_DEDUCT",
  "amount": "-12.50",
  "balanceAfter": "487.50",
  "relatedUsageId": "usage_xxx"
}
```

### `invoice.issued`

- 触发时机：账单生成

关键 payload：

```json
{
  "periodStart": "2026-07-01T00:00:00.000Z",
  "periodEnd": "2026-07-31T23:59:59.999Z",
  "subtotal": "688.00",
  "total": "688.00",
  "status": "ISSUED"
}
```

### `invoice.paid`

- 触发时机：账单支付成功

### `invoice.overdue`

- 触发时机：账单逾期

---

## 8. Marketplace Events

### `listing.created`

- 触发时机：创建 `AgentListing`

### `listing.published`

- 触发时机：Listing 上线可售

关键 payload：

```json
{
  "title": "MealKey Brand Strategist",
  "pricingModel": "SUBSCRIPTION",
  "status": "PUBLISHED"
}
```

### `listing.unpublished`

- 触发时机：Listing 下线

### `revenue_share.calculated`

- 触发时机：写入 `RevenueShare`

关键 payload：

```json
{
  "invoiceId": "inv_xxx",
  "gross": "1000.00",
  "platformAmount": "300.00",
  "publisherAmount": "700.00"
}
```

---

## 9. 事件与事实表映射

| 事实表 | 核心事件 |
| --- | --- |
| `AgentRun` | `run.created` / `run.started` / `run.completed` / `run.failed` / `run.cancelled` |
| `AgentTrace` | `trace.created` / `trace.completed` / `trace.failed` |
| `CognitiveSession` | `cognitive.session.started` |
| `CognitiveTrace` | `cognitive.trace.recorded` |
| `EvidenceReference` | `evidence.linked` |
| `ConfidenceModel` | `confidence.scored` |
| `Decision` | `decision.created` / `decision.status_changed` |
| `DecisionEvent` | `decision.accepted` / `decision.rejected` / `decision.executed` |
| `AgentOutcome` | `outcome.recorded` |
| `EvaluationResult` | `evaluation.completed` |
| `LearningRecord` | `learning.recorded` / `learning.status_changed` |
| `KnowledgeUsage` | `knowledge.used` |
| `UsageRecord` | `usage.recorded` |
| `Subscription` | `subscription.activated` / `subscription.cancelled` |
| `CreditLedger` | `credit.changed` |
| `Invoice` | `invoice.issued` / `invoice.paid` / `invoice.overdue` |
| `AgentListing` | `listing.created` / `listing.published` / `listing.unpublished` |
| `RevenueShare` | `revenue_share.calculated` |

---

## 10. Runtime 上报规则

### 外部 Runtime 必填

- `eventId`
- `eventName`
- `occurredAt`
- `entityType`
- `entityId`
- `producer`
- `source = EXTERNAL_RUNTIME`

### 幂等规则

以下场景必须带 `idempotencyKey`：

- `usage.recorded`
- `run.completed`
- `run.failed`
- `invoice.issued`
- 任意重试可能重复发送的外部事件

### 顺序规则

- 同一 `runId` 下的事件按 `occurredAt + sequence` 消费
- 若先收到结束事件、后收到开始事件，不覆盖事实，只记入异常流

---

## 11. Dashboard 指标来源冻结

### 运行层

- 总运行数：`run.created`
- 成功率：`run.completed / (run.completed + run.failed + run.cancelled)`
- 平均延迟：`run.completed.latencyMs`
- 错误率：`run.failed`

### 智能层

- 认知会话数：`cognitive.session.started`
- 规则/知识调用热度：`cognitive.trace.recorded`
- 平均总体置信度：`confidence.scored.overall`
- 决策生成数：`decision.created`
- 决策采纳率：`decision.accepted / decision.created`
- 结果反馈数：`outcome.recorded`
- 学习批准率：`learning.status_changed(to = APPROVED)`

### 商业层

- Token 消耗：`usage.recorded.token*`
- 成本：`usage.recorded.cost`
- 开票额：`invoice.issued.total`
- 分润额：`revenue_share.calculated.publisherAmount`

---

## 12. 下一步

到这里，MealKey V1 已经冻结了：

- 存什么：`Prisma Schema V1`
- 谁在什么时候产生什么：`Event Dictionary V1`

下一步直接进入：

## 《MealKey Event Payload Schema + Ingestion API Contract V1》

因为接下来要定义的是：

- 每类事件 payload 的严格字段
- Runtime 如何上报
- 平台如何验签、去重、落库
- Dashboard / Learning / Billing 如何消费
