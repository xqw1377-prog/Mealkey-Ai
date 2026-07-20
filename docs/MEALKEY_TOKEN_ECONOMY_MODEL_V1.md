# 《MealKey Token 经济模型 V1》

> 冻结结论：MealKey / Founder OS 早期不采用 SaaS 月订阅主导模式，而采用顾问型储值模型。
>
> 用户看到的是简单的余额与消耗；系统内部承载模型成本、能力复杂度、推理深度与毛利控制。

## 一、核心判断

MealKey 卖的不是 AI 调用次数，也不是模型 Token。

MealKey 卖的是：

- AI 帮老板解决经营问题的能力
- 不同复杂度咨询任务的处理能力
- 长期可复用的经营陪跑关系

因此对外不暴露底层模型 Token，不让用户理解：

- input token
- output token
- reasoning token
- run
- agent unit

对外统一抽象为：

- `经营点`

更准确地说：

> MealKey 的底层不是“AI 调用收费系统”，而是“经营智能资源计量系统”。

用户感知：

- 充值经营点
- 消耗经营点
- 获得 AI 经营服务

系统感知：

- 不同任务消耗不同智能资源
- 不同复杂度映射不同经营点
- 经营点最终再映射到底层模型成本

## 二、用户侧产品形态

用户只看到两件事：

1. 余额
2. 本次消耗

示例：

```text
剩余经营点：16880

本次消耗：860 经营点
预计还可进行：
- 约 14 次深度分析
- 或约 110 次普通咨询
```

充值入口示例：

| 价格 | 赠送经营点 |
| --- | ---: |
| ¥99 | 10000 |
| ¥499 | 60000 |
| ¥1999 | 300000 |

## 三、三层计量架构

不是：

```text
用户 Token = 模型 Token
```

而是：

```text
用户支付层
   ↓
经营点（用户余额）
   ↓
经营智能资源计量层
   ↓
模型成本层（内部成本）
```

### 3.1 用户支付层

用户购买的是经营点余额。

用户不需要知道模型品牌、上下文窗口、推理步骤，也不需要知道哪一个 Agent 在工作。

### 3.2 经营智能资源计量层

系统按“任务价值 + 智能资源消耗”定义扣点规则，而不是按底层 Token 直接透传。

核心原则不是：

- 一次调用 = 固定价格

而是：

```text
问题复杂度
+ 推理深度
+ Agent 数量
+ 数据需求
↓
经营点消耗
```

建议第一版按任务类型定价：

| 能力 | 建议消耗 |
| --- | ---: |
| Quick Ask | 5 - 20 |
| 市场洞察 | 500 |
| 品牌定位 | 800 |
| 商业模式诊断 | 1000 |
| 股权设计 | 1200 |
| AI经营委员会 | 5000 |
| 深度推演 | 10000 |

说明：

- 用户理解的是“这件事值多少钱”
- 系统内部再根据复杂度、深度、模型、数据调用做动态修正

### 3.3 模型成本层

内部持续记录：

- tokenInput
- tokenOutput
- tokenReasoning
- tokenCached
- provider
- model
- latency
- external tool / data call
- real cost

这一层只用于：

- 毛利分析
- 定价校准
- 模型切换
- 超高成本任务预警
- 成本引擎校正

## 四、任务定价原则

未来不要把对外价格绑定到 Agent 技术名。

不要让用户理解：

- M-MKT
- M-PNT
- M-BIZ
- M-ED

对外统一翻译为任务价值：

| 技术能力 | 用户感知名称 | 建议基础价 |
| --- | --- | ---: |
| m-mkt | 市场洞察 | 500 |
| m-pnt | 品牌定位 | 800 |
| m-biz | 商业模式诊断 | 1000 |
| m-ed | 股权设计 | 1200 |
| founder council | AI经营委员会 | 5000 |

## 五、动态加价因子

第一版建议内部支持三个修正因子：

### 5.1 深度因子

| 深度 | 系数 |
| --- | ---: |
| quick | x1.0 |
| standard | x1.2 |
| deep | x1.5 |

### 5.2 模型因子

| 模型档位 | 系数 |
| --- | ---: |
| economy | x1.0 |
| pro | x1.3 |
| premium | x1.8 |

### 5.3 工具因子

| 工具情况 | 系数 |
| --- | ---: |
| 纯文本 | x1.0 |
| 带搜索/抓取 | x1.1 |
| 带多轮推演/多工具 | x1.25 |

最终计算建议：

```text
finalCostPoints = baseCost * depthMultiplier * modelMultiplier * toolMultiplier
```

然后：

- 向上取整
- 设置单次上限
- 保证用户调用前可以预估

## 六、免费策略

早期建议：

- 不做强 SaaS 月订阅
- 采用“注册即送经营点”

建议首版：

- 注册赠送 `3000 经营点`

可支持：

- 若干次普通咨询
- 1 次轻量诊断

目的不是让用户薅羊毛，而是让用户快速体验：

- 有价值
- 可理解
- 不烧脑

## 七、反“烧钱感”体验设计

这是 Token 模式能不能成立的关键。

必须避免用户感觉：

- 每问一句都在扣钱
- 不知道为什么扣这么多
- 不知道还剩多少能用

前端必须提供：

### 7.1 调用前预估

```text
本次预计消耗：800 - 1200 经营点
```

### 7.2 调用后回显

```text
本次实际消耗：860 经营点
剩余：16020 经营点
```

### 7.3 余额可解释

```text
按当前使用方式，约还可进行：
- 15 次深度分析
- 或 120 次普通咨询
```

### 7.4 高成本动作二次确认

对于四席会议、深度推演等大额任务：

```text
这次将消耗约 5000 经营点，是否继续？
```

## 八、核心数据结构

当前代码里的：

- `includedRuns`
- `includedTokens`
- `overageRunCents`

不适合作为 V1 主模型。

建议新增三类核心对象。

### 8.1 UserWallet

```ts
type UserWallet = {
  userId: string;
  balancePoints: number;
  totalPurchasedPoints: number;
  totalConsumedPoints: number;
  status: "active" | "frozen";
  updatedAt: string;
};
```

### 8.2 TokenTransaction

```ts
type TokenTransaction = {
  id: string;
  userId: string;
  type: "grant" | "purchase" | "consume" | "refund" | "adjust";
  amount: number;
  balanceAfter: number;
  reason: string;
  relatedRunId?: string;
  relatedOrderId?: string;
  createdAt: string;
};
```

示例：

```text
+3000 注册赠送
+10000 购买 ¥99 充值包
-1200 商业模式诊断
-5000 四席经营会议
```

### 8.3 CapabilityPricingRule

```ts
type CapabilityPricingRule = {
  capability: string;
  baseCost: number;
  depthMultipliers: Record<string, number>;
  modelMultipliers: Record<string, number>;
  toolMultipliers: Record<string, number>;
  minCost?: number;
  maxCost?: number;
  active: boolean;
};
```

## 九、与当前代码的映射关系

当前代码已经有三类可复用基础：

1. `UsageRecord`
   - 可继续作为底层消耗事实表
   - 但用途改为“成本与诊断事实”，不再直接承载用户侧商品语义

2. `Payment / Invoice`
   - 可保留作为充值购买流水
   - 商品从“套餐/专项包”转为“经营点充值包”

3. `BillingAccount / CreditLedger`
   - 可以逐步迁移为 wallet 语义
   - 但命名和展示层需要改成经营点账户

## 十、迁移策略

建议按三步迁移，而不是一次性大改。

### Phase 1：先换商品语义

- 前台不再强调套餐 / run / token
- 改成经营点余额 + 充值包
- 后端暂时仍可复用现有 payment / invoice 基础设施

### Phase 2：引入经营点账本

- 新增 `UserWallet`
- 新增 `TokenTransaction`
- 每次能力调用后真实扣点

### Phase 3：底层成本归因

- 统一补齐各 Agent 的 token/cost 记录
- 计算单次任务毛利
- 动态调整 pricing rule

## 十一、V1 冻结项

《MealKey Token 经济模型 V1》冻结以下内容：

1. 用户侧商品形态：经营点充值包
2. 用户侧余额单位：经营点
3. 技术层与商品层解耦：用户点数 ≠ 模型 Token
4. 收费基准：按能力价值扣点
5. 系统内部：持续记录真实 token 成本与毛利
6. 免费策略：注册赠送经营点
7. 高成本任务：必须预估并确认

## 十二、最终定义

MealKey Founder OS 的商业模型冻结为：

```text
免费注册
  ↓
赠送经营点
  ↓
充值购买经营点
  ↓
调用能力消耗经营点
  ↓
系统内部自动换算模型成本
  ↓
持续优化价格与毛利
```

MealKey 不向用户售卖技术资源。

MealKey 售卖的是：

- 经营问题的解决能力
- 决策质量
- 经营陪跑效率
- 长期认知资产积累

这才符合 Founder OS 的产品属性。
