# 《MealKey Token经济模型 V1 - 后端数据库迁移与接口改造清单》

> 目标：不推翻现有 Agent 架构，只把计费层从 SaaS Subscription 模式升级为经营智能资源消耗模式。
>
> 这份文档是执行清单，不讨论价格高低，专门冻结数据库迁移、服务替换、接口改造、双写策略与切换顺序。

## 一、总体迁移原则

当前模式：

```text
User
  ↓
Subscription
  ↓
Plan
  ↓
Run Quota
  ↓
Agent Execute
  ↓
Usage Record
```

迁移后：

```text
User
  ↓
Wallet（经营点钱包）
  ↓
Consumption Engine
  ↓
Agent Capability Pricing
  ↓
Agent Execute
  ↓
Cost Tracking
  ↓
Ledger
```

关键边界：

- Agent 不改
- 四个 Agent 继续独立运行：
  - `M-PNT`
  - `M-MKT`
  - `M-BIZ`
  - `M-ED`
- 变化只发生在：
  - 调用前
  - 调用后

也就是说，迁移对象不是 Agent Runtime 本身，而是 Runtime 外围的计费与消耗层。

## 二、数据库设计 V1

### 2.1 不删除什么

以下对象保留：

- `Subscription`
- `Plan`

原因：

- 企业版、团队版未来仍可能需要
- 历史订单与订阅关系仍需兼容
- 现有支付、发票、管理台链路暂时仍能复用

但这两者不再作为核心计费真相。

核心计费真相迁移为：

- `UserWallet`
- `WalletLedger`
- `ConsumptionRecord`
- `CapabilityPrice`

## 三、新增 Wallet 模型

建议 Prisma 模型：

```prisma
model UserWallet {
  id             String   @id @default(cuid())
  userId         String   @unique
  balance        Int      @default(0)
  totalPurchased Int      @default(0)
  totalConsumed  Int      @default(0)
  frozenAmount   Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
}
```

字段解释：

- `balance`
  - 当前可用经营点
- `totalPurchased`
  - 历史累计购买经营点
- `totalConsumed`
  - 历史累计消耗经营点
- `frozenAmount`
  - 预扣但尚未结算的经营点

示例：

- 一次 AI 经营委员会，预计消耗 `5000`
- 调用前先冻结 `5000`
- 执行后按实际差额退回或补扣

这个字段是后续“预扣 + 结算”的基础。

## 四、新增 Ledger 流水表

这是财务核心，不能缺。

建议 Prisma 模型：

```prisma
model WalletLedger {
  id           String   @id @default(cuid())
  userId       String
  walletId     String
  amount       Int
  balanceAfter Int
  type         String
  reason       String
  referenceId  String?
  metadata     Json?
  createdAt    DateTime @default(now())
}
```

建议的 `type` 枚举值：

- `PURCHASE`
- `CONSUME`
- `REFUND`
- `BONUS`
- `EXPIRE`
- `RESERVE`
- `RELEASE`
- `SETTLE`
- `ADJUST`

示例：

充值：

```text
+60000
type: PURCHASE
reason: 创业包充值
```

消耗：

```text
-1200
type: CONSUME
reason: M-BIZ商业模式分析
```

退款：

```text
+1200
type: REFUND
reason: AI执行失败
```

预扣：

```text
-5000
type: RESERVE
reason: AI经营委员会预授权
```

这个表负责回答：

- 钱从哪来
- 点数为什么减少
- 是否有退款或补扣
- 当前余额是否能通过流水回放

## 五、新增 Capability Pricing

这是未来扩展的关键。

不要把收费模型写成：

```text
m-biz = 多少钱
```

要改成：

```text
能力 = 多少钱
```

建议 Prisma 模型：

```prisma
model CapabilityPrice {
  id                   String   @id @default(cuid())
  capability           String
  baseCost             Int
  depthMultiplier      Float
  complexityMultiplier Float
  active               Boolean  @default(true)
  createdAt            DateTime @default(now())
}
```

V1 示例数据：

| 能力 | 基础 |
| --- | ---: |
| 品牌定位 | 800 |
| 市场分析 | 600 |
| 商业诊断 | 1200 |
| 股权设计 | 1500 |
| 经营委员会 | 5000 |

后续扩展：

- 招聘 Agent
- 选址 Agent
- 供应链 Agent

都不需要改 Billing，只要新增：

- `capability`
- `pricing rule`
- `agent adapter`

## 六、新增 Consumption Record

`UsageRecord` 保留，但不再承担用户侧计费解释。

新增专门的用户级消耗记录：

```prisma
model ConsumptionRecord {
  id              String   @id @default(cuid())
  userId          String
  capability      String
  agentCodes      String[]
  requestedAmount Int
  actualAmount    Int
  status          String
  tokenInput      Int
  tokenOutput     Int
  model           String
  cost            Float
  createdAt       DateTime @default(now())
}
```

这个表的作用是双向解释：

用户侧：

- 我花了什么
- 为什么扣了这些经营点

公司侧：

- 这个能力是否赚钱
- 这个能力的真实成本是多少

建议 `status` 包括：

- `AUTHORIZED`
- `RUNNING`
- `SETTLED`
- `FAILED`
- `REFUNDED`

## 七、Billing Service 重构

当前核心入口是：

```ts
assertAgentQuota()
```

这个接口应逐步废弃。

替换为：

```ts
consumeCapability()
```

更准确地说，V1 要引入的新入口应是：

```ts
await consumptionService.authorize({
  userId,
  capability: "business_model",
  depth: "deep",
  complexity: "medium",
});
```

返回：

```json
{
  "approved": true,
  "estimatedCost": 1200,
  "balanceAfter": 45000
}
```

执行 Agent 后，再调用：

```ts
await consumptionService.settle({
  recordId,
  actualTokens,
  actualCost,
});
```

因此 `billing.service.ts` 的重构原则是：

- 保留支付兼容能力
- 保留旧 plan / subscription / invoice 兼容能力
- 停止承担 run quota 主逻辑
- 停止承担 capability 定价逻辑

## 八、四个 Agent 接入方式

当前外层模式：

```text
billing check
↓
runMBiz
↓
usage save
```

迁移后：

```text
consume(capability)
↓
runAgent
↓
recordCost
↓
settle
```

四个 Agent 对应的 capability 建议映射：

- `M-BIZ`
  - `business_model`
- `M-PNT`
  - `brand_strategy`
- `M-MKT`
  - `market_analysis`
- `M-ED`
  - `equity_design`

重点：

- Agent 内部逻辑不改
- 只改外围调用链
- 先插入授权和结算层

## 九、Token 处理策略

这里必须采用双层模型。

用户层：

```text
经营点
```

内部层：

```text
LLM token
```

两者关系：

```text
经营点
↓
消费价值单位

token
↓
成本单位
```

示例：

- 一次 `M-BIZ`
- 用户扣：`1200点`
- 实际 GPT 成本：`0.18美元`
- 结果：形成毛利记录

冻结原则：

- 用户永远不理解 token
- 系统内部必须真实记录 token
- 经营点负责商业化
- token 负责成本核算

## 十、支付系统调整

现有充值与支付链路可复用，但商品语义要调整。

以前：

```text
余额充值
```

现在：

```text
购买经营点
```

建议在 `payment` 里新增：

```ts
productType: "BUSINESS_POINTS"
```

商品示例：

```json
{
  "name": "创业经营包",
  "price": 499,
  "points": 60000
}
```

支付成功后：

- 不再主要做套餐激活
- 改为钱包入账
- 发票继续走现有机制

## 十一、后台运营必须新增

否则未来一定会失控。

必须新增：

## Capability Dashboard

建议展示：

| 能力 | 调用量 | 收入 | 成本 | 毛利 |
| --- | ---: | ---: | ---: | ---: |
| M-BIZ | 100 | ¥12000 | ¥900 | 92% |
| M-PNT | 300 | ¥50000 | ¥6000 | 88% |

这张表比单纯看用户数更重要。

因为 MealKey 未来卖的是：

- 智能能力
- 决策价值
- 顾问型结果

而不是传统 SaaS 席位本身。

## 十二、迁移步骤

建议不要一次重构。

### Phase 1

新增：

- `UserWallet`
- `WalletLedger`
- `ConsumptionRecord`

这一阶段不影响现有收费。

### Phase 2

双写：

一次调用同时写：

- 旧的 run 扣费链路
- 新的经营点消费记录

目标：

- 观察新模型是否稳定
- 校验预估与实际差异
- 验证数据完整性

### Phase 3

正式切换：

关闭：

- `Run quota`

启用：

- `Consumption Engine`

### Phase 4

清理旧逻辑：

- `includedRuns`
- `overageRunCents`

这一步不一定立刻物理删除字段，但要从主流程中退场。

## 十三、最终架构冻结

MealKey 商业底座冻结为：

```text
                Payment
                   |
                Wallet
                   |
                Ledger
                   |
         Consumption Engine
                   |
         Capability Pricing
                   |
    --------------------------------
    M-PNT  M-MKT  M-BIZ  M-ED
                   |
             Cost Tracking
                   |
           Business Analytics
```

这个架构的核心价值是：

- 新增 Agent 不需要重写 Billing
- 计费逻辑从 Agent 解耦
- 用户支付逻辑和模型成本逻辑彻底分层
- 未来 10 个以上 Agent 仍能扩展

## 十四、执行清单

### 数据库

- 新增 `UserWallet`
- 新增 `WalletLedger`
- 新增 `CapabilityPrice`
- 新增 `ConsumptionRecord`

### 服务层

- 新增 `wallet.service.ts`
- 新增 `ledger.service.ts`
- 新增 `pricing.service.ts`
- 新增 `consumption.service.ts`
- 新增 `cost.service.ts`

### 接口替换

- `assertAgentQuota()` -> `consumptionService.authorize()`
- `chargeOverageIfNeeded()` -> `consumptionService.settle()`
- 旧余额充值 -> `BUSINESS_POINTS` 入钱包

### 四个 Agent 外围接入

- `M-BIZ` 接 `business_model`
- `M-PNT` 接 `brand_strategy`
- `M-MKT` 接 `market_analysis`
- `M-ED` 接 `equity_design`

### 运营后台

- 新增 Capability Dashboard
- 按能力看收入 / 成本 / 毛利

## 十五、结论

MealKey 的商业化底座不该继续围绕：

- 订阅时长
- run 次数
- 单 Agent 门禁

而应该围绕：

- 经营点钱包
- 智能资源消耗
- 能力定价
- 成本追踪

这意味着 MealKey 从“AI 工具平台”真正升级为“AI 经营智能经济系统”。
