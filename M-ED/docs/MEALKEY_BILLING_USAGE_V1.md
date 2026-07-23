# MealKey Billing & Usage V1

> 文档类型：平台数据契约  
> 日期：2026-07-11  
> 目标：冻结 Token 耗用、Usage 计量、计费账本、套餐与 Marketplace 定价规则

## 1. 文档定位

这份文档不定义 UI，也不直接等于 Prisma Schema。

它定义的是 MealKey 在商业化层的四个共识：

1. 什么是消耗事实
2. 什么是可计费单位
3. 什么是可售卖产品
4. 什么是结算账本

如果这一层不先冻结，后面的 `AgentRun`、`UsageRecord`、`Billing`、`Marketplace` 会各讲各的。

---

## 2. 核心原则

### 2.1 Token 不是商品，只是底层燃料

MealKey 最终卖的不是 Token。

MealKey 卖的是：

- Agent 能力
- Observability 能力
- Learning 能力
- Runtime 管理能力
- Marketplace 分发能力

Token 只是这些能力在底层运行时产生的一种资源消耗事实。

### 2.2 `UsageRecord` 是成本事实源

以下对象职责必须分开：

- `AgentRun`：一次执行事实
- `UsageRecord`：一次资源消耗事实
- `BillingLedger` / `CreditLedger`：一次账务变化事实
- `Invoice`：一个结算周期的聚合结果

因此：

- `AgentRun.tokens` 只能是聚合快照
- 不作为最终对账与计费事实源

### 2.3 一次 Run 可以对应多条 Usage

一次 Agent 执行可能包含：

- 多次 LLM 调用
- 重试
- 多模型协同
- 外部 Runtime 回传 usage
- 工具调用产生的第三方成本

所以 `AgentRun 1:N UsageRecord` 必须成立。

### 2.4 事实不回写，退款走账本

如果发生：

- 平台补贴
- 平台故障重试
- 客诉退款

不修改 `UsageRecord` 事实，只新增账本动作：

- `REFUND`
- `ADJUST`
- `CREDIT_GRANT`

---

## 3. 商业模型收敛

V1 冻结四种商业模式：

### 3.1 Subscription

按月 / 按年收费，包含固定额度。

适合：

- 官方 Agent 套餐
- Observability 能力包
- 团队版 / 企业版

### 3.2 Usage-Based

按使用量收费。

支持单位：

- `TOKEN`
- `RUN`
- `DECISION`
- `RUNTIME`
- `API_CALL`

### 3.3 Hybrid

基础订阅 + 超额 usage。

这是 MealKey V1 官方产品的主模式。

### 3.4 Marketplace Revenue Share

第三方 Agent 入驻 Marketplace 后：

- 按订阅抽佣
- 按 usage 抽佣
- 或平台收固定技术服务费

---

## 4. 计费层四级结构

MealKey 商业化建议固定为四层：

```text
Usage Fact
  ↓
Billable Unit
  ↓
Commercial Product
  ↓
Settlement Ledger
```

对应解释：

### 4.1 Usage Fact

实际消耗了什么。

例子：

- 输入 Token 1120
- 输出 Token 684
- 推理 Token 240
- 第三方 OCR 成本 0.08 元

### 4.2 Billable Unit

哪些消耗被拿来计费。

例子：

- 这次 Run 是否计费
- 这次 Evaluation 是否免计费
- 这次外部 Runtime 上报是否只观察不结算

### 4.3 Commercial Product

用户买的是什么。

例子：

- Pro 套餐
- 企业版平台授权
- 单个 Agent 订阅
- 第三方 Agent 使用权

### 4.4 Settlement Ledger

钱怎么变动。

例子：

- 授予额度
- 消耗额度
- 平台退款
- 月末出账

---

## 5. V1 核心对象

## 5.1 UsageRecord

底层资源消耗事实源。

建议结构：

```prisma
model UsageRecord {
  id               String   @id @default(cuid())
  billingAccountId String?
  runId            String?
  runtimeId        String?
  agentId          String
  agentVersionId   String?
  userId           String?
  projectId        String?

  provider         String
  model            String
  usageType        UsageType
  source           UsageSource

  tokenInput       Int      @default(0)
  tokenOutput      Int      @default(0)
  tokenCached      Int      @default(0)
  tokenReasoning   Int      @default(0)
  tokenTotal       Int      @default(0)

  unitCost         Decimal? @db.Decimal(18, 6)
  totalCost        Decimal? @db.Decimal(18, 6)
  currency         Currency @default(CNY)

  billable         Boolean  @default(true)
  externalUsageId  String?
  idempotencyKey   String?

  occurredAt       DateTime
  createdAt        DateTime @default(now())
}
```

规则：

- `UsageRecord` 是 `Token Consumption` 的唯一事实源
- 外部 Runtime 上报时必须带 `externalUsageId` 或 `idempotencyKey`
- `runId` 可空，因为外部系统可能只上报 usage，不上报完整 run

### UsageType

```text
LLM
EMBEDDING
OCR
ASR
TOOL
EVALUATION
SYSTEM
```

### UsageSource

```text
MEALKEY_RUNTIME
EXTERNAL_RUNTIME
MARKETPLACE_AGENT
INTERNAL_EVALUATION
MANUAL_IMPORT
```

---

## 5.2 BillingAccount

谁来支付，谁来承接账务。

```prisma
model BillingAccount {
  id           String      @id @default(cuid())
  ownerType    BillingOwnerType
  ownerId      String
  billingMode  BillingMode
  currency     Currency    @default(CNY)
  status       BillingStatus
  createdAt    DateTime    @default(now())
}
```

### BillingOwnerType

```text
USER
ORGANIZATION
PROJECT
PARTNER
```

### BillingMode

```text
SUBSCRIPTION
USAGE
HYBRID
ENTERPRISE
```

---

## 5.3 Plan

卖什么套餐。

```prisma
model Plan {
  id               String    @id @default(cuid())
  name             String
  planType         PlanType
  billingCycle     BillingCycle
  includedTokens   Int       @default(0)
  includedRuns     Int?
  overageEnabled   Boolean   @default(false)
  overageUnitType  BillableUnitType?
  overageUnitPrice Decimal?  @db.Decimal(18, 6)
  currency         Currency  @default(CNY)
  status           PlanStatus
  createdAt        DateTime  @default(now())
}
```

### BillableUnitType

```text
TOKEN
RUN
DECISION
RUNTIME
API_CALL
MONTH
```

---

## 5.4 CreditLedger

额度账本。用于记录余额变化，不篡改 usage。

```prisma
model CreditLedger {
  id               String           @id @default(cuid())
  billingAccountId String
  changeType       CreditChangeType
  amount           Decimal          @db.Decimal(18, 6)
  balanceAfter     Decimal          @db.Decimal(18, 6)
  relatedUsageId   String?
  relatedInvoiceId String?
  createdAt        DateTime         @default(now())
}
```

### CreditChangeType

```text
GRANT
CONSUME
REFUND
EXPIRE
ADJUST
```

---

## 5.5 Invoice

结算周期的聚合对象。

```prisma
model Invoice {
  id               String        @id @default(cuid())
  billingAccountId String
  periodStart      DateTime
  periodEnd        DateTime
  subtotal         Decimal       @db.Decimal(18, 6)
  discount         Decimal       @db.Decimal(18, 6)
  total            Decimal       @db.Decimal(18, 6)
  currency         Currency      @default(CNY)
  status           InvoiceStatus
  createdAt        DateTime      @default(now())
}
```

### InvoiceStatus

```text
DRAFT
ISSUED
PAID
VOID
```

---

## 5.6 AgentListingPricing

Marketplace 的定价对象，不要把 Marketplace 价格塞回 `AgentDefinition`。

```prisma
model AgentListingPricing {
  id                     String           @id @default(cuid())
  agentListingId         String
  pricingModel           PricingModel
  unitType               BillableUnitType
  unitPrice              Decimal?         @db.Decimal(18, 6)
  revenueShareRate       Float?
  supportedDeployment    String           // JSON: deployment modes
  availabilityScope      String?          // JSON: region / tenant scope
  status                 ListingPriceStatus
  currency               Currency         @default(CNY)
  createdAt              DateTime         @default(now())
}
```

### PricingModel

```text
FREE
SUBSCRIPTION
USAGE
HYBRID
```

---

## 6. 数据规则冻结

## 6.1 Source of Truth 规则

| 对象 | 角色 | 是否事实源 |
| --- | --- | --- |
| `AgentRun` | 执行摘要 | 否 |
| `UsageRecord` | 资源消耗 | 是 |
| `CreditLedger` | 额度账本 | 是 |
| `Invoice` | 结算结果 | 否，属于周期聚合 |

规则：

- `AgentRun.tokens` 只能做展示快照
- 成本、毛利、账单必须从 `UsageRecord` 与 `Ledger` 推导

## 6.2 Idempotency 规则

外部 Runtime 上报 usage 时必须满足其一：

- `externalUsageId`
- `idempotencyKey`

如果都没有：

- 拒绝落库

## 6.3 Retry 规则

重试产生的新 token 属于真实消耗。

因此：

- 真实重试成本照实记 `UsageRecord`
- 是否收费由 `billable` 决定
- 如果平台决定补贴，新增 `REFUND` 或 `ADJUST`

## 6.4 Currency 规则

V1 只支持：

- `CNY`
- `USD`

任何金额对象都不允许裸字符串。

### Currency

```text
CNY
USD
```

## 6.5 精度规则

- Token 一律用 `Int`
- 金额一律用 `Decimal(18,6)` 口径
- 展示层可四舍五入到分
- 账本层保留高精度

## 6.6 Billable 规则

不是所有 usage 都可收费。

典型 `billable = false`：

- 内部评测
- 平台回归测试
- 灰度发布验证
- 平台主动补偿的重试

## 6.7 External Runtime 规则

外部 Runtime 分两种模式：

### Managed Billing

由 MealKey 统一结算：

- 上报 usage
- 进入账本
- 可出账单

### BYOM

客户自带模型：

- usage 进入 Observability
- 不进入平台代扣
- 平台只收订阅费 / 平台费 / 管理费

---

## 7. 计费规则冻结

## 7.1 官方 Agent

默认走 `HYBRID`：

- 套餐送基础额度
- 超额按 `TOKEN` 或 `RUN` 收费

## 7.2 第三方 Marketplace Agent

支持两类结算：

- `SUBSCRIPTION_REVENUE_SHARE`
- `USAGE_REVENUE_SHARE`

MealKey 平台不应该只记录价格，还要记录：

- `platform take rate`
- `publisher gross revenue`
- `publisher net settlement`

## 7.3 企业版

支持：

- 平台授权费
- Runtime 管理费
- Observability / Learning 增值费
- BYOM 模式下不代扣模型成本

---

## 8. 指标契约

## 8.1 Token Consumption

- 来源：`UsageRecord`
- 公式：`sum(tokenTotal)`
- 去重：按 `usageRecord.id`

## 8.2 Billable Token

- 来源：`UsageRecord`
- 公式：`sum(tokenTotal where billable = true)`
- 去重：按 `usageRecord.id`

## 8.3 Token Cost

- 来源：`UsageRecord`
- 公式：`sum(totalCost)`
- 去重：按 `usageRecord.id`

## 8.4 Average Cost Per Run

- 来源：`UsageRecord + AgentRun`
- 公式：`sum(totalCost) / distinct(runId)`
- 去重：按 `runId`

## 8.5 Cost Per Decision

- 来源：`UsageRecord + Decision`
- 公式：`sum(cost for decision-related runs) / decision_count`
- 去重：按 `decision.id`

## 8.6 Gross Margin

- 来源：`Invoice + Ledger + UsageRecord`
- 公式：`(revenue - cost) / revenue`

## 8.7 Marketplace Take Rate

- 来源：`AgentListingPricing + Ledger`
- 公式：`platform_revenue / gross_marketplace_volume`

---

## 9. 与平台主模型的关系

商业层必须挂在 Agent 平台模型之上，而不是反过来约束平台。

推荐链路：

```text
AgentDefinition
  ↓
AgentVersion
  ↓
AgentRuntime
  ↓
AgentRun
  ↓
UsageRecord
  ↓
BillingAccount / Plan
  ↓
CreditLedger / Invoice
```

Marketplace 定价链路：

```text
AgentDefinition
  ↓
AgentListing
  ↓
AgentListingPricing
  ↓
BillingLedger / Revenue Share
```

---

## 10. 对现有 Schema 的直接影响

现有 `apps/web/prisma/schema.prisma` 中：

- `AgentRun.tokens`
- `AgentProduct.pricing`

都还是旧模型。

这两个字段不能再继续承担未来平台级商业逻辑。

建议后续迁移策略：

1. 保留旧字段做兼容
2. 新增 `UsageRecord` / `BillingAccount` / `Plan` / `Ledger` / `Invoice`
3. 逐步把：
   - token 统计
   - 套餐逻辑
   - Marketplace 定价
   从旧字段迁移到新对象

---

## 11. V1 最小闭环

V1 先做最小可运行闭环，不一次做满所有商业能力。

最小上线对象：

- `UsageRecord`
- `BillingAccount`
- `Plan`
- `CreditLedger`
- `Invoice`
- `AgentListingPricing`

最小闭环能力：

1. 官方 Agent：套餐 + 超额 usage
2. 企业版：BYOM 观察 + 平台收费
3. 第三方 Agent：Marketplace 抽佣

---

## 12. 最终结论

MealKey 不应该把 Token 当成产品。

MealKey 应该把 Token 当成底层燃料，并在其上构建：

- Usage 事实层
- Billing 账本层
- Pricing 商业层
- Marketplace 分发层

只有这样，MealKey 才能同时支持：

- 官方 Agent 商业化
- 第三方 Agent Marketplace
- 企业版平台收费
- 外部 Runtime 接入

下一步进入：

## 《MealKey Agent Platform Prisma Schema V1》

并把本文件中的对象与规则作为 Prisma 的物理实现约束，而不是在 Schema 阶段重新发明一套商业逻辑。
