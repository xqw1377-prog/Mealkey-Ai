# 《MealKey Token经济模型 V1 → 后端架构改造方案》

> 目标：让 MealKey 从“按 Agent Run 扣费系统”升级为“按经营智能资源消耗系统”。
>
> 这一层不讨论价格高低，只冻结后端架构、核心模块、调用链、预扣结算机制与迁移顺序。

## 一、当前架构问题回顾

当前主链路可以概括为：

```text
用户
  ↓
Agent 调用
  ↓
agent.service / router
  ↓
billing.assertAgentQuota()
  ↓
run 次数检查
  ↓
usage 记录
```

这个模型已经能工作，但不适合 Founder OS 下一阶段。

### 1. Billing 绑死 Agent

当前计费和额度语义直接挂在：

- `m-mkt`
- `m-pnt`
- `m-biz`
- `m-ed`

问题：

- 每增加一个 Agent，就要增加一套计费判断
- 未来如果扩展到 20 个 Agent，Billing 会持续膨胀
- 计费系统与专业能力强绑定，不利于统一经济模型

### 2. Run 不是价值单位

现在“一次普通问答”和“一次四席经营委员会深度决策”都可以被记成一次 run。

这是错误抽象。

run 是技术执行单位，不是用户价值单位。

真正应该计量的是：

- 任务复杂度
- 推理深度
- Agent 参与数量
- 数据需求
- 产出价值

### 3. Usage 不能支撑经营分析

当前 usage 体系能回答：

- 发生了几次 run
- 写了多少 token 字段

但还不能回答：

- 哪个能力赚钱
- 哪个能力亏损
- 用户为什么愿意付费
- 什么能力最有价值
- 哪类任务应该提价或降价

所以系统缺的不是“再加一个套餐字段”，而是：

> 一个独立的经营智能资源计量层。

## 二、V2 目标架构

目标升级为：

```text
                Billing / Payment
                        ↓
                 Wallet System
                        ↓
              Consumption Engine
                        ↓
              Capability Pricing
                        ↓
                 Agent Runtime
                        ↓
                 Cost Tracking
```

各层职责必须分开：

### Billing / Payment

负责：

- 收钱
- 创建订单
- 支付确认
- 开票

不再负责：

- run 限额判断
- Agent 额度判断
- 智能资源消耗计算

### Wallet System

负责：

- 用户余额
- 充值入账
- 冻结额度
- 扣减额度
- 退款 / 调整

### Consumption Engine

负责：

- 计算预计消耗
- 检查余额
- 执行预扣
- 执行结算
- 写用户级消耗流水

### Capability Pricing

负责：

- 按能力定义基础价格
- 按深度、复杂度、模型、数据需求做乘数修正

### Agent Runtime

负责：

- 真正执行咨询任务
- 输出结构化结果
- 回传 token / model / latency / provider

### Cost Tracking

负责：

- 记录真实模型成本
- 记录工具成本
- 计算毛利
- 给后续定价优化提供事实

## 三、核心模块冻结

建议新增目录：

```text
apps/web/src/server/services/
  wallet.service.ts
  ledger.service.ts
  pricing.service.ts
  consumption.service.ts
  cost.service.ts
```

## 3.1 `wallet.service.ts`

负责：

- 获取钱包
- 创建钱包
- 增加余额
- 冻结余额
- 提交扣减
- 释放冻结

建议接口：

```ts
getWallet(userId)
ensureWallet(userId)
creditPoints(input)
reservePoints(input)
commitPoints(input)
releaseReservedPoints(input)
```

## 3.2 `ledger.service.ts`

必须独立存在。

原因：

- 财务审计
- 调账追溯
- 幂等保证
- 余额回放

建议接口：

```ts
appendLedger(input)
listLedger(userId, filters?)
replayWalletBalance(userId)
```

## 3.3 `pricing.service.ts`

负责：

- 基础能力价格
- 深度倍率
- 复杂度倍率
- 模型倍率
- 数据倍率
- agent 数量倍率

建议接口：

```ts
getPricingRule(input)
estimateConsumption(input)
```

建议第一版用代码配置或 YAML，不要求先做管理台可视化编辑。

## 3.4 `consumption.service.ts`

这是系统心脏。

负责：

- 生成预估
- 发起预扣
- 结算实际消耗
- 写消费记录
- 返回用户可理解的消费原因

建议接口：

```ts
previewConsumption(input)
authorizeConsumption(input)
settleConsumption(input)
refundConsumption(input)
```

## 3.5 `cost.service.ts`

负责：

- 记录真实 token 使用
- 记录 provider / model
- 计算 LLM 成本
- 汇总 revenue / cost / margin

建议接口：

```ts
recordCost(input)
computeMargin(input)
summarizeCapabilityCost(filters)
```

## 四、Wallet 钱包系统

钱包系统负责用户余额真相。

## 4.1 UserWallet

建议数据结构：

```prisma
model UserWallet {
  id              String   @id
  userId          String   @unique
  balance         Int
  totalPurchased  Int
  totalConsumed   Int
  createdAt       DateTime
  updatedAt       DateTime
}
```

说明：

- 余额统一用 `Int`
- 单位统一为“经营点”
- `balance` 是用户唯一真实余额

示例：

用户充值 `¥499`，兑换 `60000` 经营点后：

```text
balance = 60000
```

## 五、Ledger 交易流水

不能直接修改余额而不留痕。

必须每次都写流水。

## 5.1 TokenLedger

建议数据结构：

```prisma
model TokenLedger {
  id          String     @id
  userId      String
  amount      Int
  type        LedgerType
  reason      String
  referenceId String?
  createdAt   DateTime
}
```

建议枚举：

```ts
enum LedgerType {
  PURCHASE
  CONSUME
  REFUND
  BONUS
  EXPIRE
  RESERVE
  RELEASE
  SETTLE
}
```

示例：

- 充值：`+60000 / PURCHASE`
- M-BIZ 深度诊断：`-1200 / CONSUME`
- 预扣冻结：`-1000 / RESERVE`
- 实际补扣：`-200 / SETTLE`

## 六、Consumption Engine

这是整个系统的心脏。

建议输入：

```ts
consume({
  userId,
  capability,
  task,
  depth,
  complexity,
  agents,
  model,
})
```

示例：

```json
{
  "capability": "brand_strategy",
  "task": "positioning",
  "depth": "deep",
  "complexity": 3,
  "agents": ["m-pnt"]
}
```

返回：

```json
{
  "consumed": 850,
  "reason": "品牌深度定位分析",
  "balance": 45000
}
```

### 6.1 预估职责

调用前必须支持：

- 本次预计消耗多少经营点
- 当前余额是否足够
- 是否需要高成本二次确认

### 6.2 扣减职责

调用中必须支持：

- 先冻结预估金额
- 执行任务
- 按实际结果结算

### 6.3 回写职责

调用后必须支持：

- 写用户侧消费记录
- 写内部成本记录
- 写差额调整记录

## 七、Pricing Engine

不要把价格写死在业务代码里。

建议采用配置驱动。

例如：

```yaml
capabilities:
  brand_strategy:
    base: 500
  business_model:
    base: 800
  market_analysis:
    base: 600
  founder_council:
    base: 3000

depth:
  basic: 1
  deep: 2
  founder: 5

complexity:
  low: 1
  medium: 1.5
  high: 3
```

建议第一版公式：

```text
consumption
=
base
× depth
× complexity
× agent_count
```

第二版再补：

- model factor
- data factor
- tool factor

## 八、Cost Engine

内部必须知道真实成本。

建议记录结构：

```json
{
  "agent": "m-biz",
  "model": "gpt-5",
  "inputTokens": 5000,
  "outputTokens": 3000,
  "costUSD": 0.15
}
```

最终计算：

```text
Revenue
- LLM Cost
= Gross Margin
```

这样系统才能回答：

- 哪个能力赚钱
- 哪个能力亏损
- 哪个模型不适合某类任务
- 哪类任务需要重新定价

## 九、Agent 改造方式

当前模式更像：

```ts
await assertAgentQuota()
await runAgent()
```

未来建议改成：

```ts
const preview = await consumptionEngine.preview({
  capability: "business_model",
  depth: "deep",
})

const authorization = await consumptionEngine.authorize(preview)

const result = await runAgent()

await consumptionEngine.settle({
  authorizationId: authorization.id,
  actual: result.actualConsumption,
})

await costEngine.recordCost({
  runId: result.runId,
  capability: "business_model",
  usage: result.usage,
})
```

统一流程：

```text
用户请求
↓
计算预计消耗
↓
余额检查
↓
预扣 / 冻结
↓
执行 Agent
↓
真实成本回写
↓
差额结算
```

## 十、为什么必须采用“预扣 + 结算”

因为 LLM 成本在执行前无法完全确定。

例如：

- 预计：`1000 点`
- 实际：`1500 点`

如果没有预扣和结算机制，系统就会出现：

- 先做完再发现余额不够
- 无法解释为什么多扣
- 高成本任务失控

因此第一版建议采用：

### 10.1 预授权

先冻结预计消耗：

```text
冻结 1000 点
```

### 10.2 任务执行

执行 Agent / Committee / Deep Analysis

### 10.3 最终结算

如果实际：

- 小于预估：退回差额
- 大于预估：补扣差额

这本质上类似信用卡预授权。

## 十一、现有 Billing 如何迁移

不要推倒重来。

建议分阶段迁移。

### Phase 1

保留：

- `Subscription`
- `Invoice`
- `BillingAccount`

新增：

- `UserWallet`
- `TokenLedger`
- `Consumption Engine`

### Phase 2

停止把 `includedRuns` 作为主收费依据。

逐步把用户主语义迁移为：

- 经营点余额
- 经营点充值
- 经营点消耗

### Phase 3

所有 Agent 接入 `Consumption Engine`。

包括未来的：

- M-EXECUTION
- M-GROWTH
- 财务 Agent
- 招聘 Agent
- 选址 Agent

此后新增能力只需要增加：

- Capability
- Pricing Rule
- Agent Adapter

不再需要重写 Billing。

## 十二、最终商业闭环

```text
用户充值
↓
Wallet 增加经营点
↓
调用能力
↓
Consumption Engine 计算
↓
Ledger 扣减 / 结算
↓
Agent 执行
↓
Cost Engine 记录成本
↓
优化价格模型
```

## 十三、这一步完成后的价值

MealKey 会从：

```text
AI 工具平台
```

升级为：

```text
AI 经营智能经济系统
```

它的意义不只是“换一种收费方式”，而是把：

- 钱包
- 价值计量
- 成本控制
- 任务消耗
- 多 Agent 扩展

放进同一套后端基础设施里。
