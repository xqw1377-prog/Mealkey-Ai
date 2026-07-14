# MealKey Platform Migration Plan V1

> 文档类型：迁移计划
> 日期：2026-07-11
> 目标：在不打断现有业务页的前提下，把 MealKey 从旧应用模型迁移到 Agent Platform 模型

## 1. 迁移目标

V1 不是“一次性重做全库”。

V1 的目标是：

1. 新平台模型先加进去
2. 新事件接入先跑起来
3. Dashboard / Billing / Learning 先切到新事实源
4. 旧页面继续可用

---

## 2. 迁移原则

### 原则 1

只做增量迁移，不做破坏式替换。

### 原则 2

先建事实层，再建投影层，最后再切读路径。

### 原则 3

旧字段先降级为兼容层，不立即删除。

### 原则 4

优先迁移高价值链路：

- Run
- Trace
- Usage
- Decision
- Outcome

---

## 3. 当前旧模型问题

当前 `apps/web/prisma/schema.prisma` 主要还是旧应用结构，核心问题有三类：

### 3.1 对象边界混杂

- `Owner`
- 旧 `Project`
- 旧 `AgentRun`
- `AgentProduct`

还没有拉成平台级对象关系。

### 3.2 事实层不够独立

- `AgentRun.tokens` 仍承担了一部分 usage 含义
- 决策状态和运行状态还没有完全事件化

### 3.3 商业与学习链路还没有独立跑通

- Billing 事实层不完整
- Learning 回写链路还没有变成正式流水线

---

## 4. 迁移总路线

```text
Phase 0: Freeze Docs
  ↓
Phase 1: Add New Prisma Models
  ↓
Phase 2: Add Event Ingestion Layer
  ↓
Phase 3: Build Runtime / Dashboard Projections
  ↓
Phase 4: Build Billing & Usage Projections
  ↓
Phase 5: Build Learning Pipeline
  ↓
Phase 6: Degrade Legacy Fields to Compatibility Layer
```

---

## 5. 分阶段计划

## Phase 0: 冻结文档

已完成：

- `MEALKEY_AGENT_PLATFORM_PRISMA_SCHEMA_V1.md`
- `MEALKEY_EVENT_DICTIONARY_V1.md`
- `MEALKEY_EVENT_PAYLOAD_INGESTION_API_CONTRACT_V1.md`

产出：

- 平台对象关系冻结
- 事件词典冻结
- 上报协议冻结

---

## Phase 1: 新增平台对象

目标：

先把新对象加进 Prisma，但不切旧读路径。

### 1.1 必加模型

- `Organization`
- `OrganizationMember`
- `AgentDefinition`
- `AgentVersion`
- `AgentRuntime`
- `AgentTrace`
- `AgentOutcome`
- `EvaluationResult`
- `LearningRecord`
- `KnowledgeUsage`
- `BillingAccount`
- `Subscription`
- `Plan`
- `CreditLedger`
- `Invoice`
- `AgentListing`
- `RevenueShare`
- `PlatformEvent`

### 1.2 暂不删除

- `Owner`
- 旧 `Decision`
- 旧 `AgentRun`
- `AgentProduct`

### 1.3 交付标准

- Prisma schema 可生成
- migration 可执行
- 不破坏现有页面和现有 API

---

## Phase 2: 事件接入层

目标：

新增平台事件入口，不改现有页面调用方式。

### 2.1 新接口

- `POST /api/platform/events/ingest`
- `POST /api/platform/events/batch`

### 2.2 首批支持事件

- `run.started`
- `run.completed`
- `run.failed`
- `trace.failed`
- `usage.recorded`
- `decision.created`
- `decision.accepted`
- `outcome.recorded`

### 2.3 交付标准

- 可验签
- 可去重
- 可落 `PlatformEvent`
- 可驱动对应事实表更新

---

## Phase 3: Runtime / Dashboard 投影

目标：

把运行监控类指标切到新事实源。

### 3.1 首批投影

- Run 总数
- 成功率
- 失败率
- 平均延迟
- Top Error Codes
- Trace 失败分布

### 3.2 读路径切换

以下页面优先切读新投影：

- Runtime Dashboard
- Agent Observability
- Run Detail

### 3.3 交付标准

- 页面不再依赖页面内临时聚合
- 所有运行指标可追溯到 `AgentRun / AgentTrace / PlatformEvent`

---

## Phase 4: Billing / Usage 投影

目标：

让 Token、成本、账务开始从平台事实源出数。

### 4.1 首批投影

- Token Usage Monitor
- Provider Cost Breakdown
- Billable vs Non-billable Usage
- Invoice Summary
- Credit Balance

### 4.2 核心事实源

- `UsageRecord`
- `CreditLedger`
- `Invoice`
- `RevenueShare`

### 4.3 交付标准

- 成本不再从 `AgentRun.tokens` 直接推
- 账务可回溯到 usage 与账本事件

---

## Phase 5: Learning Pipeline

目标：

让学习链变成正式流水线，而不是松散逻辑。

### 5.1 固定链路

```text
AgentRun
  ↓
AgentOutcome
  ↓
EvaluationResult
  ↓
LearningRecord
  ↓
KnowledgeNode Update
```

### 5.2 首批能力

- Outcome 收集
- Evaluation 写入
- Learning 审批流
- KnowledgeUsage 归因

### 5.3 交付标准

- 不允许跳过 `EvaluationResult` 直接写知识
- Learning 可审计
- Knowledge 更新有来源链

---

## Phase 6: 旧字段降级

目标：

旧对象继续保留，但只作为兼容层。

### 6.1 降级对象

- `AgentRun.tokens`
- `AgentProduct.pricing`
- 旧 `Owner` 逻辑

### 6.2 处理方式

- 停止新增依赖
- 停止新增页面直接读取
- 在文档中标为 legacy

---

## 6. 建议实施顺序

建议按这个工程顺序推进：

1. Prisma 新模型
2. `PlatformEvent` 原始事件表
3. 单事件接入 API
4. `run.* / trace.failed / usage.recorded` 首批接入
5. Runtime Dashboard 投影
6. Billing Monitor 投影
7. Learning Pipeline
8. Legacy 字段降级

---

## 7. 风险与处理

### 风险 1：新旧模型并存导致语义冲突

处理：

- 文档明确 source of truth
- 新页面只读新模型
- 旧页面逐步迁移

### 风险 2：外部 Runtime 重试污染账单

处理：

- 强制 `eventId`
- 强制 `idempotencyKey`
- `usage.recorded` 幂等优先

### 风险 3：Learning 直接写知识导致脏知识

处理：

- 强制经过 `Outcome -> Evaluation -> LearningRecord`

### 风险 4：Dashboard 继续偷算页面逻辑

处理：

- 指标统一改为读 projection
- 页面不再直接拼业务真相

---

## 8. 当前最值得先做的工程任务

如果下一步进入实现，我建议先做四件事：

1. 在 `schema.prisma` 新增 `PlatformEvent`、`AgentTrace`、`AgentOutcome`、`UsageRecord`
2. 新增 `POST /api/platform/events/ingest`
3. 先把 `run.completed` 和 `usage.recorded` 接进来
4. 做一个最小 Runtime / Usage Dashboard

这样收益最高，因为它最先打通：

- Runtime 可观测
- 成本可见
- Dashboard 有事实源

---

## 9. 最终结论

MealKey 现在已经不是“继续长页面”的阶段了。

接下来最正确的工程动作是：

> 先把平台事实层接起来，再让页面读平台真相。

这份迁移计划的作用，就是保证我们后面的实现顺序不会乱。
