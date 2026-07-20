# 《MealKey Token经济模型 V1 → 数据库和后端改造方案》

> 目标：把当前 `billing / usage / quota / payment` 的 run 套餐模型，迁移为 Founder OS 的经营点储值模型。
>
> 这份文档不讨论产品愿景，只冻结工程落地边界、表结构、服务职责、迁移顺序与兼容策略。

## 一、当前系统事实

当前代码里已经存在一套可用但不适合继续扩张的计费基础：

- `Plan`
- `Subscription`
- `BillingAccount`
- `CreditLedger`
- `Invoice`
- `UsageRecord`
- `AgentEntitlement`

当前问题不是“没有计费系统”，而是：

1. 用户商品语义还是套餐 / 专项包 / 额度包
2. 扣费主规则按 `includedRuns + overageRunCents`
3. `includedTokens` 存在，但不参与真实结算
4. `UsageRecord` 记录了 token 字段，但成本和粒度不完整
5. `assertAgentQuota(...)` 仍然是 run 限额思维

因此新模型不应该在旧对象上继续堆条件，而应该把它们拆成两层：

- 用户余额层
- 内部成本层

## 二、改造目标

冻结为：

### 用户侧

- 经营点余额
- 充值购买经营点
- 调用任务消耗经营点

### 系统侧

- `Consumption Engine` 负责计算本次该扣多少点
- `Cost Engine` 负责计算本次真实模型成本
- `UsageRecord` 保留为底层事实表
- `Wallet / Ledger` 负责用户余额真相

## 三、目录结构冻结

建议新增目录：

```text
apps/web/src/server/founder-layer/billing/
  wallet.ts
  token-ledger.ts
  pricing-engine.ts
  consumption-engine.ts
  cost-engine.ts
  checkout.ts
  types.ts
```

职责边界：

### `wallet.ts`

- 读取用户钱包
- 充值入账
- 扣减余额
- 冻结 / 解冻

### `token-ledger.ts`

- 写经营点流水
- 提供幂等检查
- 提供余额回放能力

### `pricing-engine.ts`

- 管理能力基础价
- 管理 depth / model / data / multi-agent 系数
- 输出预估消耗

### `consumption-engine.ts`

- 接收一次任务请求
- 调用定价引擎
- 扣点
- 写消耗流水
- 返回 `consumed / balance / reason`

### `cost-engine.ts`

- 汇总模型 token
- 计算真实成本
- 记录毛利
- 给后续定价校准提供依据

### `checkout.ts`

- 充值包下单
- 支付成功后入钱包
- 开票

## 四、数据库对象改造

## 4.1 新增 `UserWallet`

```ts
type UserWallet = {
  id: string;
  userId: string;
  ownerId?: string | null;
  balancePoints: number;
  totalPurchasedPoints: number;
  totalConsumedPoints: number;
  status: "active" | "frozen";
  createdAt: string;
  updatedAt: string;
};
```

设计说明：

- `userId` 是最小归属单位
- 可选保留 `ownerId`，便于和现有业务兼容
- `balancePoints` 是对外唯一真实余额

## 4.2 新增 `TokenTransaction`

```ts
type TokenTransaction = {
  id: string;
  walletId: string;
  userId: string;
  type: "grant" | "purchase" | "consume" | "refund" | "adjust";
  amount: number;
  balanceAfter: number;
  reason: string;
  sourceType?: string | null;
  sourceId?: string | null;
  metadata?: string | null;
  createdAt: string;
};
```

示例：

- 注册赠送 `+3000`
- 购买创业版 `+60000`
- 商业模式深度诊断 `-1200`
- Founder 会议 `-5000`

## 4.3 新增 `CapabilityPricingRule`

```ts
type CapabilityPricingRule = {
  id: string;
  capability: string;
  scenario?: string | null;
  baseCost: number;
  complexityMultiplier: string;
  depthMultiplier: string;
  modelMultiplier: string;
  dataMultiplier: string;
  agentMultiplier: string;
  minCost?: number | null;
  maxCost?: number | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};
```

建议说明：

- 各 multiplier 可先存 JSON
- 早期不要求平台管理台可视化编辑
- 先代码种子 + 数据库记录双写

## 4.4 新增 `ConsumptionRecord`

```ts
type ConsumptionRecord = {
  id: string;
  walletId: string;
  userId: string;
  capability: string;
  scenario?: string | null;
  depth?: string | null;
  complexity?: string | null;
  model?: string | null;
  agents?: string | null;
  estimatedCost: number;
  actualCost: number;
  balanceAfter: number;
  reason: string;
  runId?: string | null;
  orderId?: string | null;
  metadata?: string | null;
  createdAt: string;
};
```

作用：

- 记录用户层“为什么扣了这些经营点”
- 和 `UsageRecord` 分工明确

## 4.5 可选新增 `CostRecord`

```ts
type CostRecord = {
  id: string;
  runId?: string | null;
  capability: string;
  provider?: string | null;
  model?: string | null;
  tokenInput: number;
  tokenOutput: number;
  tokenReasoning: number;
  tokenCached: number;
  tokenTotal: number;
  llmCostCents: number;
  toolCostCents: number;
  totalCostCents: number;
  revenuePoints: number;
  revenueValueCents: number;
  marginCents: number;
  createdAt: string;
};
```

如果想减少表数量，也可以先不单独建表，把这部分先写入 `UsageRecord.metadata`。

## 五、旧对象如何处理

## 5.1 `BillingAccount`

现状：

- 它现在承接了账户余额和订阅关系

建议：

- 短期保留
- 中期降级为支付账户 / 开票账户
- 不再承担用户经营点余额真相

即：

- `BillingAccount.balance` 不再是核心余额
- 核心余额迁移到 `UserWallet.balancePoints`

## 5.2 `CreditLedger`

现状：

- 记录充值和超额扣费

建议：

- 短期保留给财务账使用
- 不再作为用户经营点真相
- 用户点数流水改为 `TokenTransaction`

## 5.3 `Subscription`

现状：

- 套餐、专项包、额度包都挂在这里

建议：

- 早期继续保留，兼容旧数据与订单
- 新充值商品不再创建平台套餐订阅
- 只在“充值包订单”中使用支付和发票对象

也就是说：

- `Subscription` 逐步淡出用户主商业模型
- 未来可只保留给企业版或平台合作版

## 5.4 `AgentEntitlement`

现状：

- 用于专项咨询包或计划赠送权限

建议：

- 经营点模型下不再承担收费逻辑
- 是否允许某能力，应由产品权限和系统状态控制
- 收费只由 `Consumption Engine` 扣点

换句话说：

- `Entitlement != Billing`

## 5.5 `UsageRecord`

现状：

- 适合继续作为底层 usage 事实

建议：

- 保留
- 增强字段完整性
- 不直接等价于用户侧扣费单据

它回答的是：

- 模型实际消耗了什么资源

不是：

- 用户应该被收多少钱

## 六、核心接口冻结

## 6.1 预估接口

```ts
estimateConsumption({
  userId,
  capability,
  scenario,
  depth,
  complexity,
  agents,
  model,
  dataLevel,
})
```

返回：

```json
{
  "estimated": 1200,
  "currency": "POINTS",
  "reason": "M-BIZ 深度商业诊断",
  "balance": 16880,
  "enough": true
}
```

## 6.2 扣减接口

```ts
consume({
  userId,
  capability,
  scenario,
  depth,
  complexity,
  agents,
  model,
  runId,
})
```

返回：

```json
{
  "consumed": 1260,
  "balance": 15620,
  "reason": "M-BIZ深度商业诊断"
}
```

## 6.3 成本登记接口

```ts
recordCost({
  runId,
  capability,
  provider,
  model,
  tokenInput,
  tokenOutput,
  tokenReasoning,
  tokenCached,
  llmCostCents,
  toolCostCents,
})
```

## 七、现有代码迁移映射

## 7.1 `billing.service.ts`

当前职责过重，混在一起做了：

- 套餐种子
- entitlement
- quota
- overage
- credit pack side effect

建议拆分：

### 保留在旧层

- 支付兼容逻辑
- invoice 兼容逻辑
- 历史 plan 元数据兼容

### 迁移到新层

- `assertAgentQuota` -> `estimateConsumption / canConsume`
- `chargeOverageIfNeeded` -> `wallet.consume`
- `credit_pack` side effect -> `wallet.topUp`

## 7.2 `usage.service.ts`

当前是：

- 一次 run 写一条 `UsageRecord`
- 之后按 run 次数决定是否超额扣费

建议变成：

- 只负责写底层 usage 事实
- 不再直接做用户扣费

即：

### 旧逻辑移除

- `settleHybridOverage(...)`
- 基于 `includedRuns` 的超额判定

### 新逻辑保留

- `recordAgentRunUsage(...)`
- token / model / provider 事实落库

## 7.3 `payment.service.ts`

建议改成：

- 充值包下单
- 支付成功
- `wallet.topUp(points)`
- 创建 invoice

而不是：

- 创建套餐订阅
- 分配专项包
- 发 credit pack side effect

## 7.4 runtime / agent 链路

以下调用点需要接入新引擎：

- `app/api/agent/stream/route.ts`
- `server/routers/agent.ts`
- `agent.service.ts`
- `agent-os.service.ts`
- `chief-agent.factory.ts`
- Founder Layer 后续 capability runtime

改造规则：

### 调用前

- 先 `estimateConsumption`
- 高成本任务需要前端确认

### 调用后

- 真正写 `consume(...)`
- 再写 `recordCost(...)`

### 如果失败

- 可按策略：
  - 不扣
  - 部分扣
  - 扣基础费

第一版建议：

- 失败只扣极低基础费或不扣费

## 八、迁移顺序

## Phase 0：冻结文档

- 完成 `MEALKEY_TOKEN_ECONOMY_MODEL_V1.md`
- 完成本改造方案文档

## Phase 1：先建新表，不切主流程

- 新增 `UserWallet`
- 新增 `TokenTransaction`
- 新增 `CapabilityPricingRule`
- 新增 `ConsumptionRecord`
- 可选新增 `CostRecord`

这一步不替换旧 billing。

## Phase 2：接充值包

- 新建经营点充值商品
- 支付成功后给 `wallet` 入点
- invoice 继续沿用现有支付链

## Phase 3：接预估与扣点

- 在 M-BIZ / Founder Meeting 先试点
- 打通 `estimate -> confirm -> consume`

原因：

- 这两类最能体现高价值消耗差异
- 也最适合先做高成本任务确认

## Phase 4：替换旧 quota

- 逐步移除 `assertAgentQuota`
- 停用 `includedRuns`
- 停用 `overageRunCents`

## Phase 5：旧对象降级

- `Subscription` 退出用户主收费逻辑
- `AgentEntitlement` 退出收费主逻辑
- `BillingAccount.balance` 不再作为用户主余额

## 九、兼容策略

必须保证老用户不炸。

建议：

### 9.1 老套餐用户

给一次迁移赠点：

- `starter` -> 对应一笔初始化经营点
- `growth` -> 更高额度赠点
- `partner` -> 企业级赠点

### 9.2 老余额用户

如果 `BillingAccount.balance` 还有金额：

- 按固定兑换率迁移成经营点

### 9.3 老发票和订单

- 保持原样
- 不回写改历史数据
- 新订单开始使用经营点商品语义

## 十、第一版不做什么

为了落地速度，V1 不建议同时做：

- 平台管理台可视化定价编辑器
- 多组织共享钱包
- 企业采购合并结算
- BYOM 成本分摊
- 复杂退款策略
- 多币种

先把：

- 充值
- 预估
- 扣点
- 成本
- 毛利

这五件事跑通。

## 十一、最终工程定义

MealKey Token 经济模型 V1 的后端改造目标是：

```text
支付系统负责收钱
钱包系统负责记余额
定价系统负责算消耗
消耗系统负责扣点
成本系统负责算毛利
Usage 系统负责记录底层资源事实
```

这是 Founder OS 后续所有能力统一收费的基础设施。
